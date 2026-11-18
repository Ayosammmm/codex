/**
 * Installation des mods : archive ZIP contenant un manifest.json (à la racine, ou dans un unique dossier),
 * et éventuellement les fichiers des pages (html, js, css, images, sons, polices).
 *
 * Les fichiers sont extraits dans backend/installed-mods/<id>/ et servis sur /mod-files/<id>/...
 * avec un en-tête CSP « sandbox » : le code d'un mod ne s'exécute jamais avec l'origine de l'application
 * (pas d'accès à la session), il dialogue avec elle par postMessage (voir frontend/src/mods/ModPageHost.jsx).
 */
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const yauzl = require('yauzl');

const { saveStream, isZipFile, httpError } = require('./universeArchive');
const { normalizeManifest } = require('./modManifest');
const { Mod } = require('../models/Mod');

const MODS_ROOT = path.resolve(__dirname, '..', 'installed-mods');
const MANIFEST = 'manifest.json';
const MAX_UPLOAD_BYTES = 50 * 1024 ** 2;
const MAX_EXTRACTED_BYTES = 100 * 1024 ** 2;
const MAX_ENTRIES = 2000;
// Fichiers acceptés dans un mod (les autres sont ignorés)
const FILE_EXTENSIONS = new Set([
  '.html', '.htm', '.js', '.mjs', '.css', '.json', '.txt', '.md', '.map',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico',
  '.mp3', '.ogg', '.oga', '.wav', '.m4a', '.opus', '.webm',
  '.woff', '.woff2', '.ttf', '.otf',
]);

/** Dossier des fichiers d'un mod. */
const modDir = (id) => path.join(MODS_ROOT, id);

/** Lit la liste des entrées d'une archive (sans les extraire). */
const listEntries = (zipPath) => new Promise((resolve, reject) => {
  yauzl.open(zipPath, { lazyEntries: true, strictFileNames: true }, (openError, zip) => {
    if (openError) return reject(httpError(`Archive illisible : ${openError.message}`));
    const entries = [];
    let total = 0;
    zip.on('error', (error) => reject(httpError(`Archive illisible : ${error.message}`)));
    zip.on('end', () => resolve(entries));
    zip.on('entry', (entry) => {
      if (entries.length >= MAX_ENTRIES) {
        zip.close();
        return reject(httpError("L'archive contient trop de fichiers."));
      }
      total += entry.uncompressedSize;
      if (total > MAX_EXTRACTED_BYTES) {
        zip.close();
        return reject(httpError('Mod trop volumineux une fois décompressé (100 Mo maximum).', 413));
      }
      if (!entry.fileName.endsWith('/')) entries.push(entry.fileName);
      zip.readEntry();
    });
    zip.readEntry();
  });
});

/**
 * Racine du mod dans l'archive : '' si manifest.json est à la racine,
 * 'dossier/' si l'archive contient un unique dossier (cas d'un dossier compressé tel quel).
 */
const findRoot = (entries) => {
  if (entries.includes(MANIFEST)) return '';
  const candidates = entries.filter((e) => e.endsWith(`/${MANIFEST}`) && e.split('/').length === 2);
  if (candidates.length === 1) return candidates[0].slice(0, -MANIFEST.length);
  throw httpError(`L'archive ne contient pas de ${MANIFEST} à sa racine.`);
};

/** Chemin relatif d'une entrée dans le mod, ou null si elle est ignorée / dangereuse. */
const relativeEntry = (root, entryName) => {
  if (!entryName.startsWith(root)) return null;
  const rel = entryName.slice(root.length);
  if (!rel || rel.split('/').some((part) => !part || part === '..' || part.startsWith('.'))) return null;
  if (!FILE_EXTENSIONS.has(path.extname(rel).toLowerCase())) return null;
  return rel;
};

/** Extrait les fichiers acceptés de la racine du mod dans `destDir`. */
const extract = (zipPath, root, destDir) => new Promise((resolve, reject) => {
  yauzl.open(zipPath, { lazyEntries: true, strictFileNames: true }, (openError, zip) => {
    if (openError) return reject(httpError(`Archive illisible : ${openError.message}`));
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(error.status ? error : httpError(`Archive illisible : ${error.message}`));
    };
    zip.on('error', fail);
    zip.on('end', () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    zip.on('entry', (entry) => {
      const rel = entry.fileName.endsWith('/') ? null : relativeEntry(root, entry.fileName);
      if (!rel) return zip.readEntry();
      const target = path.resolve(destDir, rel);
      if (!target.startsWith(destDir + path.sep)) return zip.readEntry();
      zip.openReadStream(entry, async (streamError, stream) => {
        if (streamError) return fail(streamError);
        try {
          await fsp.mkdir(path.dirname(target), { recursive: true });
          await pipeline(stream, fs.createWriteStream(target));
          zip.readEntry();
        } catch (error) {
          fail(error);
        }
      });
    });
    zip.readEntry();
  });
});

/** Liste récursive des fichiers d'un dossier (chemins relatifs avec des /). */
const walk = async (dir, prefix = '') => {
  const out = [];
  for (const item of await fsp.readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) out.push(...(await walk(path.join(dir, item.name), rel)));
    else out.push(rel);
  }
  return out;
};

/**
 * Installe (ou met à jour) un mod depuis le corps brut d'une requête (archive ZIP).
 * Renvoie la ligne Mod enregistrée. Un mod du même id est remplacé (ses données dans les univers sont conservées).
 */
const installFromStream = async (input, { userId } = {}) => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'codex-mod-'));
  try {
    const uploaded = path.join(tmpDir, 'upload.zip');
    const size = await saveStream(input, uploaded, MAX_UPLOAD_BYTES);
    if (!size) throw httpError('Aucun fichier envoyé.');
    if (!(await isZipFile(uploaded))) throw httpError('Le mod doit être une archive ZIP.');

    const root = findRoot(await listEntries(uploaded));
    const extractDir = path.join(tmpDir, 'mod');
    await fsp.mkdir(extractDir);
    await extract(uploaded, root, extractDir);

    let raw;
    try {
      raw = JSON.parse(await fsp.readFile(path.join(extractDir, MANIFEST), 'utf8'));
    } catch {
      throw httpError(`${MANIFEST} n'est pas un JSON valide.`);
    }
    const manifest = normalizeManifest(raw, { files: await walk(extractDir) });

    // Remplacement des fichiers : l'ancienne version n'est supprimée qu'une fois la nouvelle en place
    await fsp.mkdir(MODS_ROOT, { recursive: true });
    const target = modDir(manifest.id);
    const backup = `${target}.old-${Date.now()}`;
    const hadPrevious = fs.existsSync(target);
    if (hadPrevious) await fsp.rename(target, backup);
    try {
      await fsp.rename(extractDir, target).catch(async (error) => {
        // Dossier temporaire sur un autre disque : copie
        if (error.code !== 'EXDEV') throw error;
        await fsp.cp(extractDir, target, { recursive: true });
      });
      const [mod] = await Mod.upsert({
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        manifest,
        installedBy: userId ?? null,
      });
      if (hadPrevious) await fsp.rm(backup, { recursive: true, force: true });
      return mod;
    } catch (error) {
      await fsp.rm(target, { recursive: true, force: true });
      if (hadPrevious) await fsp.rename(backup, target);
      throw error;
    }
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
};

/** Désinstalle un mod (fichiers et ligne). Les données des univers sont conservées, masquées. */
const uninstall = async (id) => {
  const mod = await Mod.findByPk(id);
  if (!mod) return null;
  await mod.destroy();
  const dir = modDir(id);
  if (dir.startsWith(MODS_ROOT + path.sep)) await fsp.rm(dir, { recursive: true, force: true });
  return mod;
};

/** Manifeste d'un mod installé (ou null). */
const getManifest = async (id) => {
  if (typeof id !== 'string') return null;
  const mod = await Mod.findByPk(id);
  return mod ? mod.manifest : null;
};

module.exports = { MODS_ROOT, modDir, installFromStream, uninstall, getManifest, FILE_EXTENSIONS };
