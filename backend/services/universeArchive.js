/**
 * Export / import d'un univers sous forme d'archive ZIP.
 *
 * Contenu de l'archive :
 *   universe.json              données (format 'almanach-universe', version 2, sans le champ `files`)
 *   uploads/<sous-dossier>/... images, aux mêmes chemins que dans le dossier uploads du serveur
 *
 * L'import accepte aussi les anciens exports JSON (version 1, images embarquées en base64).
 */
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { ZipArchive } = require('archiver');
const yauzl = require('yauzl');

const transfer = require('./universeTransfer');

const ARCHIVE_VERSION = 2;
const MANIFEST_NAME = 'universe.json';
const MAX_UPLOAD_BYTES = 2 * 1024 ** 3; // taille max du fichier envoyé
const MAX_EXTRACTED_BYTES = 4 * 1024 ** 3; // taille max une fois décompressé
const MAX_MANIFEST_BYTES = 200 * 1024 ** 2;
const MAX_ENTRIES = 20000;

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Prépare l'archive d'un univers. Renvoie { archive, name } (archive = flux ZIP à envoyer),
 * ou null si l'univers n'existe pas. Les fichiers absents du disque sont ignorés.
 */
const createExportArchive = async (universeId) => {
  const data = await transfer.collectUniverse(universeId);
  if (!data) return null;

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const manifest = {
    format: transfer.FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: MANIFEST_NAME });

  for (const uploadPath of transfer.listFiles(data)) {
    const abs = transfer.resolveUpload(uploadPath);
    if (!abs || !fs.existsSync(abs)) continue;
    // Les images sont déjà compressées : stockées telles quelles
    archive.file(abs, { name: uploadPath.slice(1), store: true });
  }
  archive.finalize();

  return { archive, name: data.universe.name };
};

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Écrit un flux entrant dans un fichier, en refusant au-delà de `maxBytes`. */
const saveStream = async (input, target, maxBytes) => {
  let total = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      if (total > maxBytes) return callback(httpError('Fichier trop volumineux.', 413));
      callback(null, chunk);
    },
  });
  await pipeline(input, limiter, fs.createWriteStream(target));
  return total;
};

const isZipFile = async (file) => {
  const handle = await fsp.open(file, 'r');
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(4), 0, 4, 0);
    return bytesRead === 4 && buffer.readUInt32LE(0) === 0x04034b50; // "PK\x03\x04"
  } finally {
    await handle.close();
  }
};

/** Chemin de destination d'une entrée d'archive, ou null si elle est ignorée / dangereuse. */
const entryTarget = (destDir, entryName) => {
  if (entryName === MANIFEST_NAME) return path.join(destDir, MANIFEST_NAME);
  if (!transfer.isLocalUpload('/' + entryName) || entryName.endsWith('/')) return null;
  if (!transfer.MEDIA_EXTENSIONS.has(path.extname(entryName).toLowerCase())) return null;
  const abs = path.resolve(destDir, entryName);
  return abs.startsWith(path.join(destDir, 'uploads') + path.sep) ? abs : null;
};

/** Extrait universe.json et les images d'une archive dans `destDir`. */
const extractArchive = (zipPath, destDir) => new Promise((resolve, reject) => {
  yauzl.open(zipPath, { lazyEntries: true, strictFileNames: true }, (openError, zip) => {
    if (openError) return reject(httpError(`Archive illisible : ${openError.message}`));

    let entries = 0;
    let extracted = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(error.status ? error : httpError(`Archive illisible : ${error.message}`));
    };

    zip.on('error', fail);
    zip.on('end', () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    zip.on('entry', (entry) => {
      if (++entries > MAX_ENTRIES) return fail(httpError("L'archive contient trop de fichiers."));
      const target = entryTarget(destDir, entry.fileName);
      if (!target) return zip.readEntry();

      extracted += entry.uncompressedSize;
      if (extracted > MAX_EXTRACTED_BYTES) return fail(httpError('Archive trop volumineuse.', 413));
      if (entry.fileName === MANIFEST_NAME && entry.uncompressedSize > MAX_MANIFEST_BYTES) {
        return fail(httpError(`${MANIFEST_NAME} est trop volumineux.`, 413));
      }

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

const parseJson = async (file) => {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    throw httpError("Le fichier n'est pas un export d'univers valide.");
  }
};

/**
 * Importe un univers depuis le corps brut d'une requête : archive ZIP (format actuel)
 * ou ancien export JSON. Le fichier transite par un dossier temporaire supprimé ensuite.
 */
const importFromStream = async (input, { name } = {}) => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'almanach-import-'));
  try {
    const uploaded = path.join(tmpDir, 'upload');
    const size = await saveStream(input, uploaded, MAX_UPLOAD_BYTES);
    if (!size) throw httpError('Aucun fichier envoyé.');

    if (!(await isZipFile(uploaded))) {
      return await transfer.importFromExport(await parseJson(uploaded), { name });
    }

    const extractDir = path.join(tmpDir, 'archive');
    await fsp.mkdir(extractDir);
    await extractArchive(uploaded, extractDir);

    const manifestPath = path.join(extractDir, MANIFEST_NAME);
    if (!fs.existsSync(manifestPath)) throw httpError(`L'archive ne contient pas de ${MANIFEST_NAME}.`);
    const data = await parseJson(manifestPath);

    const uploadsDir = path.join(extractDir, 'uploads');
    const readFile = (uploadPath) => {
      if (!transfer.isLocalUpload(uploadPath)) return null;
      const abs = path.resolve(uploadsDir, uploadPath.slice('/uploads/'.length));
      if (!abs.startsWith(uploadsDir + path.sep) || !fs.existsSync(abs)) return null;
      return fs.readFileSync(abs);
    };

    return await transfer.importUniverse(data, { readFile, name });
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
};

module.exports = { createExportArchive, importFromStream };
