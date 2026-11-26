/**
 * Compression côté navigateur des images trop lourdes pour le serveur (5 Mo, voir backend/middlewares/upload.js).
 *
 * L'image est redessinée sur un canvas et réencodée en WebP (JPEG si le navigateur ne sait pas
 * encoder le WebP), en baissant la qualité puis la taille jusqu'à passer sous la limite.
 * La transparence est gardée en WebP.
 *
 * Les GIF ne passent pas par le canvas (il les aplatirait) : ils sont envoyés tels quels jusqu'à MAX_GIF_SIZE
 * et le serveur les convertit en WebP animé (voir backend/services/gifCompression.js).
 *
 * Sous la limite, l'image est optimisée sans perte visible (voir optimizeImage) : WebP qualité 90 %,
 * dimensions d'origine, gardé seulement s'il est nettement plus léger. Sinon, le fichier reste intact.
 */

import { toMemoryFile } from './memoryFile';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // limite du serveur
export const MAX_GIF_SIZE = 20 * 1024 * 1024; // GIF reçus par le serveur, qui les compresse ensuite
const TARGET_SIZE = MAX_IMAGE_SIZE - 64 * 1024; // marge pour l'enveloppe multipart
const MAX_DIMENSION = 4096; // au-delà, l'image est réduite d'emblée
const QUALITIES = [0.9, 0.8, 0.7, 0.6];
const MAX_SHRINKS = 6;

// Optimisation sous la limite
const OPTIMIZE_MIN_SIZE = 300 * 1024; // en dessous, le gain ne vaut pas un réencodage
const OPTIMIZE_QUALITY = 0.9; // WebP 90 % : pas de différence visible à l'œil
const OPTIMIZE_MAX_RATIO = 0.8; // la version optimisée doit faire gagner au moins 20 %
// GIF (souvent animés) et vectoriels : laissés tels quels (WebP / PNG animés : voir isAnimated)
const NOT_OPTIMIZED = new Set(['image/gif', 'image/svg+xml', 'image/apng']);

// Type MIME d'après l'extension : un fichier glissé depuis l'explorateur arrive parfois sans type
// (navigateur Flatpak / Snap), et le serveur refuse un fichier qui ne se déclare pas comme image.
const IMAGE_TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml', tif: 'image/tiff', tiff: 'image/tiff',
  ico: 'image/x-icon', heic: 'image/heic', heif: 'image/heif',
};
const typeFromName = (name) => IMAGE_TYPES[/\.([^.]+)$/.exec(name || '')?.[1]?.toLowerCase()] || '';

/** Le fichier est-il une image ? (type MIME, ou extension quand le navigateur n'en donne pas) */
export const isImageFile = (file) => !!file && (file.type.startsWith('image/') || (!file.type && !!typeFromName(file.name)));

/** Type d'image du fichier (déduit de l'extension s'il manque). */
export const imageType = (file) => file.type || typeFromName(file.name);

/**
 * Copie en mémoire d'une image choisie ou déposée, avec son type (voir memoryFile.js), compressée au-delà
 * de la limite : `{ file, compressed, originalSize }`. La lecture du fichier d'origine commence aussitôt.
 */
export const prepareImage = async (file, maxSize = MAX_IMAGE_SIZE) => fitImage(await toMemoryFile(file, imageType(file)), maxSize);

/** Taille lisible : « 8,2 Mo ». */
export const formatSize = (bytes) =>
  `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;

const toBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* format non décodable par createImageBitmap : repli sur <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Renvoie `{ file, compressed, originalSize }` : le fichier tel quel s'il respecte la limite,
 * sinon une version compressée. Rejette avec un message lisible si la compression échoue.
 */
export async function fitImage(file, maxSize = MAX_IMAGE_SIZE) {
  if (imageType(file) === 'image/gif') {
    if (file.size > MAX_GIF_SIZE) throw new Error(`Le GIF « ${file.name} » est trop lourd (${formatSize(MAX_GIF_SIZE)} maximum).`);
    return { file, compressed: false, originalSize: file.size }; // compressé par le serveur
  }
  if (file.size <= maxSize) return { file: await optimizeImage(file), compressed: false, originalSize: file.size };

  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error(`Impossible de lire l’image « ${file.name} » pour la compresser.`);
  }
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const target = Math.min(TARGET_SIZE, maxSize);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  try {
    for (let shrink = 0; shrink <= MAX_SHRINKS; shrink++) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const quality of QUALITIES) {
        let blob = await toBlob(canvas, 'image/webp', quality);
        // Navigateur sans encodeur WebP : il renvoie du PNG, on passe au JPEG
        if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
        if (blob && blob.size <= target) {
          const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
          const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`;
          return { file: new File([blob], name, { type: blob.type, lastModified: Date.now() }), compressed: true, originalSize: file.size };
        }
      }
      scale *= 0.75;
    }
  } finally {
    source.close?.();
  }
  throw new Error(`L’image « ${file.name} » est trop lourde, même compressée.`);
}

/** Image animée ? WebP : drapeau « animation » de l'en-tête VP8X ; PNG : bloc acTL (APNG) avant les données. */
async function isAnimated(file, type) {
  if (type === 'image/webp') {
    const h = new Uint8Array(await file.slice(0, 21).arrayBuffer());
    return String.fromCharCode(...h.slice(12, 16)) === 'VP8X' && (h[20] & 0x02) !== 0;
  }
  if (type === 'image/png') {
    const view = new DataView(await file.arrayBuffer());
    for (let pos = 8; pos + 8 <= view.byteLength; ) {
      const chunk = String.fromCharCode(view.getUint8(pos + 4), view.getUint8(pos + 5), view.getUint8(pos + 6), view.getUint8(pos + 7));
      if (chunk === 'acTL') return true;
      if (chunk === 'IDAT') return false;
      pos += 12 + view.getUint32(pos);
    }
  }
  return false;
}

/**
 * Optimisation sans perte visible d'une image sous la limite : WebP qualité 90 %, mêmes dimensions
 * (orientation EXIF appliquée, métadonnées retirées). Renvoie le fichier d'origine si le gain est faible,
 * si l'image est animée ou vectorielle, si le navigateur n'encode pas le WebP, ou en cas d'échec.
 */
async function optimizeImage(file) {
  const type = imageType(file);
  if (file.size < OPTIMIZE_MIN_SIZE || NOT_OPTIMIZED.has(type)) return file;
  let source;
  try {
    if (await isAnimated(file, type)) return file;
    source = await decode(file);
    const canvas = document.createElement('canvas');
    canvas.width = source.width || source.naturalWidth;
    canvas.height = source.height || source.naturalHeight;
    canvas.getContext('2d').drawImage(source, 0, 0);
    const blob = await toBlob(canvas, 'image/webp', OPTIMIZE_QUALITY);
    // Pas d'encodeur WebP (le JPEG perdrait la transparence) ou gain insuffisant : original gardé
    if (!blob || blob.type !== 'image/webp' || blob.size > file.size * OPTIMIZE_MAX_RATIO) return file;
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`;
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file; // format non décodable par le navigateur (HEIC, TIFF…) : envoyé tel quel
  } finally {
    source?.close?.();
  }
}

/** Message de notification après compression. */
export const compressionNotice = (result) =>
  `Image compressée (${formatSize(result.originalSize)} → ${formatSize(result.file.size)}) pour respecter la limite de ${formatSize(MAX_IMAGE_SIZE)}.`;
