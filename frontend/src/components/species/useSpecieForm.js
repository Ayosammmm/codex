import { useMemo, useState } from 'react';
import { isHexColor } from '@/theme/color';

const idOrEmpty = (v) => (v == null ? '' : String(v));

const toFormState = (s) => ({
  name: s?.name || '',
  parentId: idOrEmpty(s?.parentId),
  description: s?.description || '',
  characterIds: s?.characters?.map((c) => c.id) || [],
  colors: { primary: s?.colors?.primary ?? null, secondary: s?.colors?.secondary ?? null, tertiary: s?.colors?.tertiary ?? null },
  backgroundMode: s?.background ? 'image' : isHexColor(s?.backgroundColor) ? 'color' : 'none',
  backgroundColor: s?.backgroundColor || null,
});

/**
 * État du formulaire d'espèce.
 * `images` : { image (illustration), background } → File (nouvelle) | null (retirée) | absent (inchangée).
 */
export function useSpecieForm(specie) {
  const initial = useMemo(() => toFormState(specie), [specie]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Espèce rechargée (après enregistrement) : on repart de la version serveur
  if (source !== initial) {
    setSource(initial);
    setForm(initial);
    setImages({});
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setImage = (field, value) => setImages((imgs) => ({ ...imgs, [field]: value }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial) || Object.keys(images).length > 0;

  const validate = () => (form.name.trim() ? {} : { name: 'Le nom de l’espèce est requis.' });

  const toSubmit = (universeId) => {
    const values = {
      universe_id: universeId,
      name: form.name.trim(),
      description: form.description,
      parentId: form.parentId === '' ? null : Number(form.parentId),
      characterIds: form.characterIds,
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
      backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor : null,
    };
    // Fond : l'image n'est gardée qu'en mode « Image »
    const imgs = { ...images };
    if (form.backgroundMode !== 'image') {
      if (specie?.background) imgs.background = null;
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
