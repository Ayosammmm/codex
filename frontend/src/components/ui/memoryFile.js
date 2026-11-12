/**
 * Copie un fichier en mémoire, au moment où il est choisi ou déposé.
 *
 * Un File déposé depuis l'explorateur ne fait que pointer vers le disque : il est relu
 * au moment de l'envoi. Dans un navigateur isolé (Flatpak, Snap), l'accès au fichier
 * passe par un portail qui peut ne plus être valable à ce moment-là, et l'envoi échoue
 * avec « Failed to fetch ». Une copie en mémoire ne dépend plus du disque.
 *
 * Rejette avec un message lisible si le fichier est déjà illisible.
 */
export async function toMemoryFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    return new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    throw new Error(`Impossible de lire « ${file.name} ». Essayez de le choisir avec le bouton plutôt que par glisser-déposer.`);
  }
}
