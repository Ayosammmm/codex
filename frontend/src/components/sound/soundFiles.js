export const MAX_SOUND_SIZE = 20 * 1024 * 1024; // même limite que le serveur

/** Le fichier est-il un son ? (type MIME, ou extension pour les navigateurs qui n'en donnent pas) */
export const isSoundFile = (file) => file.type.startsWith('audio/') || /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|weba|webm)$/i.test(file.name);

/** Types acceptés par les champs de fichier audio. */
export const SOUND_ACCEPT = 'audio/*,.mp3,.ogg,.oga,.wav,.m4a,.aac,.flac,.opus';

/** Nom d'origine d'un son envoyé (« /uploads/…/1794…-Taverne.mp3 » → « Taverne.mp3 »). */
export const soundName = (path) => (path ? decodeURIComponent(path.split('/').pop().replace(/^\d+-/, '')) : '');
