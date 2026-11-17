import { useMemo, useState } from 'react';
import { isHexColor } from '@/theme/color';

const toFormState = (e) => ({
  name: e?.name || '',
  parentId: e?.parentId == null ? '' : String(e.parentId),
  description: e?.description || '',
  data: e?.data || {},
  colors: { primary: e?.colors?.primary ?? null, secondary: e?.colors?.secondary ?? null, tertiary: e?.colors?.tertiary ?? null },
  backgroundMode: !e?.background && isHexColor(e?.backgroundColor) ? 'color' : 'image',
  backgroundColor: e?.backgroundColor || null,
});

/**
 * État du formulaire d'une entité de mod (même principe que useSpecieForm).
 * `images` : { image, background } → File (nouvelle) | null (retirée) | absent (inchangée).
 */
export function useCustomEntityForm(entity, type) {
  const initial = useMemo(() => toFormState(entity), [entity]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Fiche rechargée (après enregistrement) : on repart de la version serveur
  if (source !== initial) {
    setSource(initial);
    setForm(initial);
    setImages({});
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setField = (key, value) => setForm((f) => ({ ...f, data: { ...f.data, [key]: value } }));
  const setImage = (field, value) => setImages((imgs) => ({ ...imgs, [field]: value }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial) || Object.keys(images).length > 0;

  const validate = () => (form.name.trim() ? {} : { name: 'Le nom est requis.' });

  const toSubmit = (universeId) => {
    // Champs vidés : envoyés à null pour être effacés côté serveur
    const data = Object.fromEntries(type.fields.map((f) => [f.key, form.data[f.key] ?? null]));
    const values = {
      universe_id: universeId,
      modId: type.modId,
      typeKey: type.key,
      name: form.name.trim(),
      description: form.description,
      ...(type.hierarchy && { parentId: form.parentId === '' ? null : Number(form.parentId) }),
      data,
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
      backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor : null,
    };
    const imgs = { ...images };
    if (form.backgroundMode !== 'image') {
      if (entity?.background) imgs.background = null;
      else delete imgs.background;
    }
    return { values, images: imgs };
  };

  const reset = () => {
    setForm(initial);
    setImages({});
  };

  return { form, update, setField, images, setImage, isDirty, validate, toSubmit, reset };
}
