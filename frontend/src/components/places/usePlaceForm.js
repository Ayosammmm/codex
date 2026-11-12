import { useMemo, useState } from 'react';
import { isHexColor } from '@/theme/color';

const idOrEmpty = (v) => (v == null ? '' : String(v));
const toNullableId = (v) => (v === '' || v == null ? null : Number(v));

const toFormState = (p) => ({
  name: p?.name || '',
  placeTypeId: idOrEmpty(p?.placeTypeId ?? p?.type?.id),
  parentId: idOrEmpty(p?.parentId),
  description: p?.description || '',
  characterIds: p?.characters?.map((c) => c.id) || [],
  groupIds: p?.controllingGroups?.map((g) => g.id) || [],
  colors: { primary: p?.colors?.primary ?? null, secondary: p?.colors?.secondary ?? null, tertiary: p?.colors?.tertiary ?? null },
  backgroundMode: !p?.background && isHexColor(p?.backgroundColor) ? 'color' : 'image',
  backgroundColor: p?.backgroundColor || null,
});

/**
 * État du formulaire de lieu.
 * `images` : { banner, background } → File (nouvelle) | null (retirée) | absent (inchangée).
 * `toSubmit(universeId, modules)` n'envoie pas les groupes si le module est désactivé.
 */
export function usePlaceForm(place) {
  const initial = useMemo(() => toFormState(place), [place]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Lieu rechargé (après enregistrement) : on repart de la version serveur
  if (source !== initial) {
    setSource(initial);
    setForm(initial);
    setImages({});
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setImage = (field, value) => setImages((imgs) => ({ ...imgs, [field]: value }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial) || Object.keys(images).length > 0;

  const validate = () => (form.name.trim() ? {} : { name: 'Le nom du lieu est requis.' });

  const toSubmit = (universeId, modules) => {
    const values = {
      universe_id: universeId,
      name: form.name.trim(),
      description: form.description,
      placeTypeId: toNullableId(form.placeTypeId),
      parentId: toNullableId(form.parentId),
      characterIds: form.characterIds,
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
      backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor : null,
    };
    if (modules.groups) values.controllingGroupIds = form.groupIds;
    // Fond : l'image n'est gardée qu'en mode « Image »
    const imgs = { ...images };
    if (form.backgroundMode !== 'image') {
      if (place?.background) imgs.background = null;
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
