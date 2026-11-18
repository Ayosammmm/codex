const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

/**
 * Vignettes des images envoyées : GET /uploads/<chemin>?w=<largeur>[&h=<hauteur>] (ou ?h=<hauteur> seule)
 *
 * - Avec `h`, l'image couvre tout le cadre w × h (proportions gardées, sans recadrage) : nécessaire pour
 *   les cadres affichés en `object-fit: cover`, où une image plus large que le cadre est mise à l'échelle de sa hauteur.
 * - Chaque dimension est arrondie à la taille prédéfinie supérieure (WIDTHS) pour limiter le nombre de variantes.
 * - La vignette est générée au premier appel (WebP, animé pour les GIF / WebP animés), puis mise en cache
 *   dans cache/thumbs/<largeur>[x<hauteur>]/<chemin>.webp. Elle est régénérée si l'original est plus récent.
 * - Sans `w` (ou pour un fichier non image), la requête continue vers le fichier d'origine.
 */

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");
const CACHE_ROOT = path.join(__dirname, "..", "cache", "thumbs");
// Écart d'environ ×1,5 entre deux tailles : le navigateur n'a jamais à beaucoup réduire l'image (sinon rendu crénelé)
const WIDTHS = [32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1440, 1920];
const RESIZABLE = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"]);

// Dimension demandée → plus petite taille prédéfinie qui la couvre (la plus grande sinon)
const pickSize = (requested) => WIDTHS.find((w) => w >= requested) || WIDTHS[WIDTHS.length - 1];
const parseSize = (value) => {
  const n = Number.parseInt(value, 10);
  return n > 0 ? pickSize(n) : null;
};
// Nom du dossier de cache : « 256 », « 256x384 » ou « x384 » (hauteur seule)
const SIZE_DIR = /^(\d*)(?:x(\d+))?$/;

const resolveInside = (root, relative) => {
  const abs = path.resolve(root, relative);
  return abs.startsWith(root + path.sep) ? abs : null;
};

// Générations en cours : deux requêtes simultanées sur la même vignette ne la calculent qu'une fois
const pending = new Map();

async function generate(source, target, { width, height }) {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await sharp(source, { animated: true, limitInputPixels: 100_000_000 })
      .rotate() // applique l'orientation EXIF des photos
      // fit "outside" : au moins width × height, proportions gardées. Noyau mitchell : plus doux que lanczos3 en petit
      .resize({ width: width || undefined, height: height || undefined, fit: "outside", withoutEnlargement: true, kernel: "mitchell" })
      .webp({ quality: 80, effort: 4 })
      .toFile(tmp);
    await fsp.rename(tmp, target);
  } catch (err) {
    await fsp.rm(tmp, { force: true });
    throw err;
  }
}

async function ensureThumb(source, target, size) {
  const [src, cached] = await Promise.all([fsp.stat(source), fsp.stat(target).catch(() => null)]);
  if (cached && cached.mtimeMs >= src.mtimeMs) return;
  if (!pending.has(target)) {
    pending.set(target, generate(source, target, size).finally(() => pending.delete(target)));
  }
  await pending.get(target);
}

/** Middleware à monter sur /uploads, avant express.static. */
async function serveThumbnail(req, res, next) {
  const width = parseSize(req.query.w);
  const height = parseSize(req.query.h);
  if (!width && !height) return next();

  let relative;
  try {
    relative = decodeURIComponent(req.path).replace(/^\/+/, "");
  } catch {
    return next();
  }
  if (!RESIZABLE.has(path.extname(relative).toLowerCase())) return next();

  const source = resolveInside(UPLOADS_ROOT, relative);
  if (!source || !fs.existsSync(source)) return next();

  const dir = height ? `${width || ""}x${height}` : String(width);
  const target = resolveInside(CACHE_ROOT, path.join(dir, `${relative}.webp`));
  if (!target) return next();

  try {
    await ensureThumb(source, target, { width, height });
    // Les noms de fichiers envoyés sont uniques (horodatés) : la vignette peut être gardée longtemps
    res.set("Cache-Control", "public, max-age=2592000");
    res.type("image/webp");
    res.sendFile(target);
  } catch (err) {
    // Image illisible par sharp : on sert l'original plutôt que de casser l'affichage
    console.error(`Vignette impossible pour ${relative}:`, err.message);
    next();
  }
}

/** Supprime les vignettes dont l'image d'origine n'existe plus (appelé au démarrage). */
async function pruneThumbnails() {
  let removed = 0;
  const walk = async (dir) => {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      // cache/thumbs/<taille>/<chemin>.webp → uploads/<chemin>
      const [sizeDir, ...rest] = path.relative(CACHE_ROOT, abs).split(path.sep);
      const [, w, h] = sizeDir.match(SIZE_DIR) || [];
      const knownSize = (w || h) && (!w || WIDTHS.includes(Number(w))) && (!h || WIDTHS.includes(Number(h)));
      const original = path.join(UPLOADS_ROOT, ...rest).replace(/\.webp$/, "");
      // Fichier temporaire abandonné, original supprimé, ou taille qui n'existe plus
      if (entry.name.endsWith(".tmp") || !knownSize || !fs.existsSync(original)) {
        await fsp.rm(abs, { force: true });
        removed++;
      }
    }
  };
  await walk(CACHE_ROOT);
  if (removed) console.log(`Vignettes : ${removed} fichier(s) orphelin(s) supprimé(s)`);
}

module.exports = { serveThumbnail, pruneThumbnails, WIDTHS };
