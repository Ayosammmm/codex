const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

/**
 * Compression des GIF envoyés : convertis en WebP animé (animation, délais et boucle gardés).
 *
 * Le navigateur ne sait pas réencoder une image animée (son canvas l'aplatirait) : les GIF lui échappent
 * et sont traités ici, après l'enregistrement par multer.
 * - GIF sous la limite des images (5 Mo) : WebP qualité 90 et WebP sans perte sont essayés, le plus léger
 *   est gardé s'il fait gagner au moins 20 % ; sinon le GIF reste tel quel.
 * - GIF au-dessus (jusqu'à MAX_GIF_SIZE) : la qualité baisse, puis les dimensions (×0,75 par étape),
 *   jusqu'à passer sous la limite ; refusé si même la plus petite version la dépasse.
 */

const MAX_GIF_SIZE = 20 * 1024 * 1024;
const MAX_RATIO = 0.8;
const QUALITIES = [85, 70];
const SHRINK_QUALITY = 70;
const MAX_SHRINKS = 5;
const FAST_EFFORT = 2; // gros GIF : encodage plus rapide (l'envoi attend la fin de la compression)
const LIMIT_PIXELS = 100_000_000;

const isGif = (file) => file.mimetype === "image/gif" || path.extname(file.originalname).toLowerCase() === ".gif";

const httpError = (status, message) => Object.assign(new Error(message), { status });

const encode = (source, options, width) => {
  let image = sharp(source, { animated: true, limitInputPixels: LIMIT_PIXELS });
  if (width) image = image.resize({ width });
  return image.webp({ effort: 4, ...options }).toBuffer();
};

/** Meilleure version WebP du GIF, ou null s'il vaut mieux garder l'original. */
async function bestWebp(file, maxSize) {
  if (file.size <= maxSize) {
    const candidates = await Promise.all([encode(file.path, { quality: 90 }), encode(file.path, { lossless: true })]);
    const smallest = candidates.reduce((a, b) => (b.length < a.length ? b : a));
    return smallest.length <= file.size * MAX_RATIO ? smallest : null;
  }
  // Au-dessus de la limite : qualité d'abord, puis dimensions
  let size;
  for (const quality of QUALITIES) {
    const buffer = await encode(file.path, { quality, effort: FAST_EFFORT });
    if (buffer.length <= maxSize) return buffer;
    size = buffer.length;
  }
  // Le poids suit à peu près la surface : première réduction estimée d'après le dernier essai, puis ×0,85
  const { width } = await sharp(file.path).metadata();
  let scale = 1;
  for (let shrink = 1; shrink <= MAX_SHRINKS; shrink++) {
    scale *= shrink === 1 ? Math.min(0.9, Math.sqrt(maxSize / size) * 0.95) : 0.85;
    const buffer = await encode(file.path, { quality: SHRINK_QUALITY, effort: FAST_EFFORT }, Math.max(1, Math.round(width * scale)));
    if (buffer.length <= maxSize) return buffer;
  }
  throw httpError(413, `GIF trop lourd, même compressé (${Math.round(maxSize / (1024 * 1024))} Mo maximum).`);
}

/** Remplace le GIF reçu par sa version WebP (met à jour `file` : filename, path, size, mimetype). */
async function compressGif(file, maxSize) {
  let buffer;
  try {
    buffer = await bestWebp(file, maxSize);
  } catch (err) {
    if (err.status) throw err;
    // GIF illisible par sharp : gardé tel quel s'il respecte la limite
    if (file.size <= maxSize) return;
    throw httpError(400, "Impossible de lire ce GIF pour le compresser.");
  }
  if (!buffer) return;
  const filename = file.filename.replace(/\.gif$/i, "") + ".webp";
  const target = path.join(path.dirname(file.path), filename);
  await fsp.writeFile(target, buffer);
  await fsp.rm(file.path, { force: true });
  Object.assign(file, { filename, path: target, size: buffer.length, mimetype: "image/webp" });
}

/**
 * Traite les fichiers reçus par multer : GIF compressés, autres images refusées au-delà de `maxSize`
 * (multer les accepte jusqu'à MAX_GIF_SIZE pour laisser passer les GIF). En cas de refus, les fichiers reçus
 * sont supprimés. `fields` : champs d'image à traiter (tous si absent).
 */
async function processImages(req, maxSize, fields) {
  const files = [req.file, ...Object.values(req.files || {}).flat()].filter(
    (f) => f && f.mimetype.startsWith("image/") && (!fields || fields.includes(f.fieldname)),
  );
  try {
    for (const file of files) {
      if (isGif(file)) await compressGif(file, maxSize);
      else if (file.size > maxSize) throw httpError(413, `Image trop lourde (${Math.round(maxSize / (1024 * 1024))} Mo maximum).`);
    }
  } catch (err) {
    const all = [req.file, ...Object.values(req.files || {}).flat()].filter(Boolean);
    await Promise.all(all.map((f) => fsp.rm(f.path, { force: true })));
    throw err;
  }
}

module.exports = { MAX_GIF_SIZE, processImages };
