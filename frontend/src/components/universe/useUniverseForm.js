import { useMemo, useState } from 'react';
import { getModulesState, toModulesPayload } from '@/config/modules';
import { DEFAULT_THEME, getTheme } from '@/theme/themes';

const toFormState = (universe) => ({
  name: universe?.name || '',
  description: universe?.description || '',
  theme: universe?.theme || DEFAULT_THEME,
  colors: {
    primary: universe?.colors?.primary || null,
    secondary: universe?.colors?.secondary || null,
    tertiary: universe?.colors?.tertiary || null,
  },
  backgroundMode: universe?.background ? 'image' : universe?.backgroundColor ? 'color' : 'none',
  backgroundColor: universe?.backgroundColor || null,
  scrimColor: universe?.scrimColor || null,
  modules: getModulesState(universe),
  // Mods activés : { [modId]: true }
  mods: universe?.mods || {},
});

/**
 * Gère l'état du formulaire d'univers.
 * `images` : { logo|banner|background: File | null } — clé absente = image inchangée.
 */
export function useUniverseForm(universe) {
  const initial = useMemo(() => toFormState(universe), [universe]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Univers rechargé (après enregistrement) : on repart de la version serveur
  if (source !== initial) {
    setSource(initial);
    setForm(initial);
    setImages({});
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setImage = (field, value) => setImages((imgs) => ({ ...imgs, [field]: value }));

  const isDirty = JSON.stringify(form) !== JSON.stringify(initial) || Object.keys(images).length > 0;

  /** Corps de la requête + changements d'images à appliquer. */
  const toSubmit = () => {
    const finalImages = { ...images };
    // Le mode de fond choisi l'emporte : on retire l'image si on passe en couleur / aucun
    if (form.backgroundMode !== 'image' && universe?.background) finalImages.background = null;
    if (form.backgroundMode !== 'image' && finalImages.background) delete finalImages.background;
    if (!universe?.id) for (const k of Object.keys(finalImages)) if (!finalImages[k]) delete finalImages[k];

    return {
      values: {
        name: form.name.trim(),
        description: form.description || null,
        theme: form.theme,
        colors: form.colors,
        backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor || getTheme(form.theme).colors.primary : null,
        scrimColor: form.backgroundMode === 'none' ? null : form.scrimColor,
        modules: toModulesPayload(form.modules),
        mods: form.mods,
      },
      images: finalImages,
    };
  };

  const reset = () => {
    setForm(initial);
    setImages({});
  };

  return { form, update, images, setImage, isDirty, toSubmit, reset };
}
