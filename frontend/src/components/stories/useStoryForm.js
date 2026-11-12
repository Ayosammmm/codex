import { useMemo, useState } from 'react';
import { sortedEpisodes } from '@/config/stories';
import { isHexColor } from '@/theme/color';

let rowId = 0;
export const newEpisodeKey = () => `episode-${++rowId}`;

const toFormState = (s) => ({
  name: s?.name || '',
  startDate: s?.startDate || '',
  endDate: s?.endDate || '',
  description: s?.description || '',
  // Épisodes dans l'ordre : existants (id) ou nouveaux (titre seul)
  episodes: sortedEpisodes(s).map((e) => ({ key: newEpisodeKey(), id: e.id, title: e.title })),
  colors: { primary: s?.colors?.primary ?? null, secondary: s?.colors?.secondary ?? null, tertiary: s?.colors?.tertiary ?? null },
  backgroundMode: !s?.background && isHexColor(s?.backgroundColor) ? 'color' : 'image',
  backgroundColor: s?.backgroundColor || null,
});

/**
 * État du formulaire d'histoire. Une histoire contient au moins un épisode (notes Obsidian).
 * `images` : { image (couverture), background } → File | null | absent.
 */
export function useStoryForm(story) {
  const initial = useMemo(
    () => (story ? toFormState(story) : { ...toFormState(null), episodes: [{ key: newEpisodeKey(), id: null, title: '' }] }),
    [story],
  );
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

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Le nom de l’histoire est requis.';
    const titled = form.episodes.filter((e) => e.title.trim());
    if (!titled.length) errors.episodes = 'Une histoire contient au moins un épisode : donnez-lui un titre.';
    else if (titled.length < form.episodes.length) errors.episodes = 'Chaque épisode doit avoir un titre.';
    return errors;
  };

  const toSubmit = (universeId) => {
    const values = {
      universe_id: universeId,
      name: form.name.trim(),
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim(),
      description: form.description,
      episodes: form.episodes.map((e) => ({ id: e.id || undefined, title: e.title.trim() })),
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
      backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor : null,
    };
    const imgs = { ...images };
    if (form.backgroundMode !== 'image') {
      if (story?.background) imgs.background = null;
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
