import { useMemo, useState } from 'react';
import { isHexColor } from '@/theme/color';

const str = (v) => (v == null ? '' : String(v));

const toFormState = (c) => ({
  name: c?.name || '',
  powerRankId: str(c?.powerRankId ?? c?.powerRank?.id),
  placeIds: c?.habitats?.map((p) => p.id) || [],
  averageSize: str(c?.averageSize),
  sizeUnit: c?.sizeUnit || 'cm',
  averageWeight: str(c?.averageWeight).replace('.', ','),
  lifeExpectancy: str(c?.lifeExpectancy),
  activityCycle: c?.activityCycle || '',
  diet: c?.diet || '',
  speed: c?.speed || '',
  physicalStrength: c?.physicalStrength || '',
  endurance: c?.endurance || '',
  robustness: c?.robustness || '',
  naturalResistances: c?.naturalResistances || '',
  naturalWeaknesses: c?.naturalWeaknesses || '',
  temperament: c?.temperament || '',
  flightBehavior: c?.flightBehavior || '',
  intelligence: c?.intelligence ?? null,
  attackTypes: c?.attackTypes || '',
  moreDetails: c?.moreDetails || '',
  colors: { primary: c?.colors?.primary ?? null, secondary: c?.colors?.secondary ?? null, tertiary: c?.colors?.tertiary ?? null },
  backgroundMode: !c?.background && isHexColor(c?.backgroundColor) ? 'color' : 'image',
  backgroundColor: c?.backgroundColor || null,
});

const decimal = (v) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

/**
 * État du formulaire de créature.
 * `images` : { image (illustration), background } → File (nouvelle) | null (retirée) | absent (inchangée).
 */
export function useCreatureForm(creature) {
  const initial = useMemo(() => toFormState(creature), [creature]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Créature rechargée (après enregistrement) : on repart de la version serveur
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
    if (!form.name.trim()) errors.name = 'Le nom de la créature est requis.';
    if (form.averageWeight.trim() && !Number.isFinite(decimal(form.averageWeight))) errors.averageWeight = 'Le poids doit être un nombre (ex. 12,5).';
    if (form.lifeExpectancy.trim() && !/^\d+$/.test(form.lifeExpectancy.trim())) errors.lifeExpectancy = 'La longévité doit être un nombre entier d’années.';
    return errors;
  };

  const toSubmit = (universeId, modules) => {
    const { colors, backgroundMode, backgroundColor, ...fields } = form;
    const values = {
      ...fields,
      universe_id: universeId,
      name: form.name.trim(),
      averageWeight: decimal(form.averageWeight),
      lifeExpectancy: form.lifeExpectancy.trim() === '' ? null : Number(form.lifeExpectancy),
      activityCycle: form.activityCycle || null,
      diet: form.diet || null,
      temperament: form.temperament || null,
      flightBehavior: form.flightBehavior || null,
      colors: Object.values(colors).some(Boolean) ? colors : null,
      backgroundColor: backgroundMode === 'color' ? backgroundColor : null,
    };
    // Module Rangs désactivé : le rang n'est pas envoyé, donc pas effacé
    if (modules.ranks) values.powerRankId = form.powerRankId === '' ? null : Number(form.powerRankId);
    else delete values.powerRankId;
    // Fond : l'image n'est gardée qu'en mode « Image »
    const imgs = { ...images };
    if (backgroundMode !== 'image') {
      if (creature?.background) imgs.background = null;
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
