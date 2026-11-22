/**
 * Compression côté navigateur des images trop lourdes pour le serveur (5 Mo, voir backend/middlewares/upload.js).
 *
 * L'image est redessinée sur un canvas et réencodée en WebP (JPEG si le navigateur ne sait pas
 * encoder le WebP), en baissant la qualité puis la taille jusqu'à passer sous la limite.
 * La transparence est gardée en WebP ; une image animée (GIF) devient fixe.
 */

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // limite du serveur
const TARGET_SIZE = MAX_IMAGE_SIZE - 64 * 1024; // marge pour l'enveloppe multipart
const MAX_DIMENSION = 4096; // au-delà, l'image est réduite d'emblée
const QUALITIES = [0.9, 0.8, 0.7, 0.6];
const MAX_SHRINKS = 6;

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
  if (file.size <= maxSize) return { file, compressed: false, originalSize: file.size };

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

/** Message de notification après compression. */
export const compressionNotice = (result) =>
  `Image compressée (${formatSize(result.originalSize)} → ${formatSize(result.file.size)}) pour respecter la limite de ${formatSize(MAX_IMAGE_SIZE)}.`;
