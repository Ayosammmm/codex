import { useMemo, useState } from 'react';
import { TRAIT_KEYS, relationNature } from '@/config/characters';
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
    .map((r) => {
      const link = r.CharacterRelation;
      // Ancien libellé libre reconnu : remplacé par la nature correspondante
      const nature = relationNature(link.relation_type);
      return {
        key: nextRowId(),
        characterId: r.id,
        relationType: nature?.key || link.relation_type,
        category: nature?.category || link.category || '',
        // Qui tient le premier rôle (Parent dans Parent / Enfant) : ce personnage ('self') ou l'autre ('other')
        lead: !nature?.roles || link.lead_id == null ? null : link.lead_id === r.id ? 'other' : 'self',
        tone: link.tone ?? null,
        evolving: Boolean(link.evolving),
      };
    }),
  traits: Object.fromEntries(TRAIT_KEYS.map((k) => [k, c?.[k] ?? null])),
  development: c?.development || '',
  developmentNote: c?.developmentNote || '',
  colors: { primary: c?.colors?.primary ?? null, secondary: c?.colors?.secondary ?? null, tertiary: c?.colors?.tertiary ?? null },
  // Nom de la forme (affiché quand le personnage a plusieurs formes)
  formName: c?.formName || '',
});

const toNullableId = (v) => (v === '' || v == null ? null : Number(v));

/**
 * État du formulaire de personnage. `images.avatar` / `images.background` : File (nouvelle image) | null (retirée) | absent.
 * `toSubmit(modules, universeId, { form })` n'envoie pas les données des modules désactivés, pour ne pas les effacer ;
 * `form: true` (autre forme du personnage) : sans les données communes à toutes les formes (groupes, lieux, relations).
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
      if (!r.characterId) return;
      const nature = relationNature(r.relationType);
      if (!r.relationType.trim()) errors[`relation-${i}`] = 'Précisez la nature de la relation.';
      else if (!nature) errors[`relation-${i}`] = 'Choisissez une nature dans la liste.';
      else if (nature.roles && !r.lead) errors[`relation-${i}`] = `Précisez qui est « ${nature.roles[0]} » et qui est « ${nature.roles[1]} ».`;
    });
    return errors;
  };

  const toSubmit = (modules, universeId, { form: isForm = false } = {}) => {
    const values = {
      universe_id: universeId,
      firstname: form.firstname.trim(),
      name: form.name.trim(),
      title: form.title.trim(),
      age: form.age === '' ? null : Number(form.age),
      sexe_id: toNullableId(form.sexe_id),
      statut_id: toNullableId(form.statut_id),
      alignment_id: toNullableId(form.alignment_id),
      personality: form.personality,
      story: form.story,
      extras: form.extras,
      placeIds: form.placeIds,
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
      formName: form.formName.trim() || null,
    };
    // Module désactivé : le rang n'est pas envoyé, donc pas effacé
    if (modules.powers) values.powers = form.powers;
    if (modules.ranks) values.rank_id = toNullableId(form.rank_id);
    if (modules.groups) values.groups = form.groups.map(({ groupId, role }) => ({ groupId, role }));
    if (modules.species) values.specieIds = form.specieIds;
    if (modules.relations) {
      values.relations = form.relations
        .filter((r) => r.characterId && r.relationType.trim())
        .map((r) => {
          const nature = relationNature(r.relationType);
          return {
            characterId: r.characterId,
            relationType: nature?.key || r.relationType.trim(),
            category: nature?.category || r.category || null,
            lead: nature?.roles ? r.lead : null,
            tone: r.tone,
            evolving: r.evolving,
          };
        });
    }
    if (modules.personality) {
      Object.assign(values, form.traits);
      values.development = form.development || null;
      values.developmentNote = form.developmentNote.trim() ? form.developmentNote : null;
    }
    if (isForm) {
      for (const key of ['universe_id', 'placeIds', 'groups', 'relations']) delete values[key];
    }
    return { values, images };
  };

  const reset = () => {
    setForm(initial);
    setImages({});
  };

  return { form, update, images, setImages, isDirty, validate, toSubmit, reset, newRelationKey: nextRowId };
}
