import { useMemo, useState } from 'react';
import { characterName } from '@/config/characters';
import { EPISODE_ROLES, episodeRole } from '@/config/stories';
import { isHexColor } from '@/theme/color';

const rank = (role) => EPISODE_ROLES.findIndex((r) => r.value === role);

const toFormState = (e) => ({
  title: e?.title || '',
  description: e?.description || '',
  // Distribution : principaux d'abord, puis par nom
  characters: [...(e?.characters || [])]
    .sort((a, b) => rank(episodeRole(a)) - rank(episodeRole(b)) || characterName(a).localeCompare(characterName(b), 'fr'))
    .map((c) => ({ characterId: c.id, role: episodeRole(c) })),
  placeIds: e?.places?.map((p) => p.id) || [],
  eventIds: e?.events?.map((ev) => ev.id) || [],
  // Fond propre (sinon celui de l'histoire)
  backgroundMode: !e?.background && isHexColor(e?.backgroundColor) ? 'color' : 'image',
  backgroundColor: e?.backgroundColor || null,
});

/**
 * État du formulaire d'épisode. `images.background` : File | null | absent.
 * `toSubmit` n'envoie pas les événements si leur module est désactivé.
 */
export function useEpisodeForm(episode) {
  const initial = useMemo(() => toFormState(episode), [episode]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  if (source !== initial) {
    setSource(initial);
    setForm(initial);
    setImages({});
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setImage = (field, value) => setImages((imgs) => ({ ...imgs, [field]: value }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial) || Object.keys(images).length > 0;
  const validate = () => (form.title.trim() ? {} : { title: 'Le titre de l’épisode est requis.' });

  const toSubmit = ({ universeId, storyId, modules }) => {
    const values = {
      universe_id: universeId,
      title: form.title.trim(),
      description: form.description,
      characters: form.characters,
      placeIds: form.placeIds,
      backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor : null,
    };
    if (storyId) values.storyId = storyId;
    if (modules.events) values.eventIds = form.eventIds;
    // Fond : l'image n'est gardée qu'en mode « Image »
    const imgs = { ...images };
    if (form.backgroundMode !== 'image') {
      if (episode?.background) imgs.background = null;
      else delete imgs.background;
    }
    return { values, images: imgs };
  };

  const reset = () => {
    setForm(initial);
    setImages({});
  };

  return { form, update, images, setImage, isDirty, validate, toSubmit, reset };
}
