import { useMemo, useState } from 'react';
import { TRAIT_KEYS } from '@/config/characters';
import { groupRoles, memberRole } from '@/config/groups';

let rowId = 0;
const nextRowId = () => `rel-${++rowId}`;

const idOrEmpty = (v) => (v == null ? '' : String(v));

const toFormState = (c) => ({
  firstname: c?.firstname || '',
  name: c?.name || '',
  title: c?.title || '',
  age: c?.age ? String(c.age) : '',
  sexe_id: idOrEmpty(c?.sexe_id ?? c?.genders?.id),
  statut_id: idOrEmpty(c?.statut_id ?? c?.statuses?.id),
  rank_id: idOrEmpty(c?.rank_id ?? c?.power_ranks?.id),
  alignment_id: idOrEmpty(c?.alignment_id ?? c?.alignments?.id),
  powers: c?.powers || '',
  personality: c?.personality || '',
  story: c?.story || '',
  extras: c?.extras || '',
  // Groupes et rôle dans chacun : [{ groupId, role }]
  groups: (c?.groups || []).map((g) => ({ groupId: g.id, role: memberRole({ CharacterGroup: g.CharacterGroup }, groupRoles(g)) })),
  specieIds: c?.species?.map((s) => s.id) || [],
  placeIds: c?.places?.map((p) => p.id) || [],
  relations: (c?.relatedCharacters || [])
    .filter((r) => r.id && r.CharacterRelation?.relation_type)
    .map((r) => ({
      key: nextRowId(),
      characterId: r.id,
      relationType: r.CharacterRelation.relation_type,
      category: r.CharacterRelation.category || '',
      tone: r.CharacterRelation.tone ?? null,
      evolving: Boolean(r.CharacterRelation.evolving),
    })),
  traits: Object.fromEntries(TRAIT_KEYS.map((k) => [k, c?.[k] ?? null])),
  development: c?.development || '',
  developmentNote: c?.developmentNote || '',
  colors: { primary: c?.colors?.primary ?? null, secondary: c?.colors?.secondary ?? null, tertiary: c?.colors?.tertiary ?? null },
});

const toNullableId = (v) => (v === '' || v == null ? null : Number(v));

/**
 * État du formulaire de personnage. `images.avatar` / `images.background` : File (nouvelle image) | null (retirée) | absent.
 * `toSubmit(modules)` n'envoie pas les données des modules désactivés, pour ne pas les effacer.
 */
export function useCharacterForm(character) {
  const initial = useMemo(() => toFormState(character), [character]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Personnage rechargé (après enregistrement) : on repart de la version serveur
  if (source !== initial) {
    setSource(initial);
    setForm(initial);
    setImages({});
  }

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial) || Object.keys(images).length > 0;

  const validate = () => {
    const errors = {};
    if (!form.firstname.trim() && !form.name.trim()) errors.identity = 'Indiquez au moins un prénom ou un nom.';
    if (form.age !== '' && (!/^\d+$/.test(form.age) || Number(form.age) > 1_000_000)) errors.age = 'L’âge doit être un nombre entier positif.';
    form.relations.forEach((r, i) => {
      if (r.characterId && !r.relationType.trim()) errors[`relation-${i}`] = 'Précisez la nature de la relation.';
    });
    return errors;
  };

  const toSubmit = (modules, universeId) => {
    const values = {
      universe_id: universeId,
      firstname: form.firstname.trim(),
      name: form.name.trim(),
      title: form.title.trim(),
      age: form.age === '' ? null : Number(form.age),
      sexe_id: toNullableId(form.sexe_id),
      statut_id: toNullableId(form.statut_id),
      alignment_id: toNullableId(form.alignment_id),
      powers: form.powers,
      personality: form.personality,
      story: form.story,
      extras: form.extras,
      placeIds: form.placeIds,
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
    };
    // Module désactivé : le rang n'est pas envoyé, donc pas effacé
    if (modules.ranks) values.rank_id = toNullableId(form.rank_id);
    if (modules.groups) values.groups = form.groups.map(({ groupId, role }) => ({ groupId, role }));
    if (modules.species) values.specieIds = form.specieIds;
    if (modules.relations) {
      values.relations = form.relations
        .filter((r) => r.characterId && r.relationType.trim())
        .map((r) => ({
          characterId: r.characterId,
          relationType: r.relationType.trim(),
          category: r.category || null,
          tone: r.tone,
          evolving: r.evolving,
        }));
    }
    if (modules.personality) {
      Object.assign(values, form.traits);
      values.development = form.development || null;
      values.developmentNote = form.developmentNote.trim() ? form.developmentNote : null;
    }
    return { values, images };
  };

  const reset = () => {
    setForm(initial);
    setImages({});
  };

  return { form, update, images, setImages, isDirty, validate, toSubmit, reset, newRelationKey: nextRowId };
}
