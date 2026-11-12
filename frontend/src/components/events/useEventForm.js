import { useMemo, useState } from 'react';
import { isHexColor } from '@/theme/color';

const toFormState = (e) => ({
  name: e?.name || '',
  date: e?.date || '',
  importance: e?.importance || '',
  description: e?.description || '',
  characterIds: e?.characters?.map((c) => c.id) || [],
  placeIds: e?.places?.map((p) => p.id) || [],
  groupIds: e?.groups?.map((g) => g.id) || [],
  episodeIds: e?.episodes?.map((ep) => ep.id) || [],
  colors: { primary: e?.colors?.primary ?? null, secondary: e?.colors?.secondary ?? null, tertiary: e?.colors?.tertiary ?? null },
  backgroundMode: e?.background ? 'image' : isHexColor(e?.backgroundColor) ? 'color' : 'none',
  backgroundColor: e?.backgroundColor || null,
});

/**
 * État du formulaire d'événement. `images` : { image, background } → File | null | absent.
 * `toSubmit` n'envoie pas les groupes si le module est désactivé.
 */
export function useEventForm(event) {
  const initial = useMemo(() => toFormState(event), [event]);
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
  const validate = () => (form.name.trim() ? {} : { name: 'Le nom de l’événement est requis.' });

  const toSubmit = (universeId, modules) => {
    const { colors, backgroundMode, backgroundColor, groupIds, ...fields } = form;
    const values = {
      ...fields,
      universe_id: universeId,
      name: form.name.trim(),
      date: form.date.trim(),
      importance: form.importance || null,
      colors: Object.values(colors).some(Boolean) ? colors : null,
      backgroundColor: backgroundMode === 'color' ? backgroundColor : null,
    };
    if (modules.groups) values.groupIds = groupIds;
    const imgs = { ...images };
    if (backgroundMode !== 'image') {
      if (event?.background) imgs.background = null;
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
