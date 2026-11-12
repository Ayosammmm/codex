import { useMemo, useState } from 'react';
import { DEFAULT_ROLES, fallbackRole, groupRoles, memberRole, roleRanker } from '@/config/groups';
import { characterName } from '@/config/characters';
import { isHexColor } from '@/theme/color';

let rowId = 0;
export const newMemberKey = () => `member-${++rowId}`;
/** Clé d'un nouveau rôle (unique dans le groupe). */
export const newRoleKey = () => `role-${Date.now().toString(36)}-${++rowId}`;

const idOrEmpty = (v) => (v == null ? '' : String(v));
const toNullableId = (v) => (v === '' || v == null ? null : Number(v));

function toFormState(g) {
  const roles = (g ? groupRoles(g) : DEFAULT_ROLES).map((r) => ({ key: r.key, name: r.name, commands: [...(r.commands || [])] }));
  const rank = roleRanker(roles);
  return {
    name: g?.name || '',
    groupTypeId: idOrEmpty(g?.groupTypeId ?? g?.type?.id),
    parentId: idOrEmpty(g?.parentId),
    description: g?.description || '',
    roles,
    // Membres triés par rang (chefs d'abord), puis par nom
    members: [...(g?.characters || [])]
      .sort((a, b) => rank(memberRole(a, roles)) - rank(memberRole(b, roles)) || characterName(a).localeCompare(characterName(b), 'fr'))
      .map((c) => ({ key: newMemberKey(), characterId: c.id, role: memberRole(c, roles) })),
    placeIds: g?.controlledPlaces?.map((p) => p.id) || [],
    colors: { primary: g?.colors?.primary ?? null, secondary: g?.colors?.secondary ?? null, tertiary: g?.colors?.tertiary ?? null },
    backgroundMode: g?.background ? 'image' : isHexColor(g?.backgroundColor) ? 'color' : 'none',
    backgroundColor: g?.backgroundColor || null,
  };
}

/**
 * État du formulaire de groupe.
 * `images` : { image (logo), banner, background } → File (nouvelle) | null (retirée) | absent (inchangée).
 */
export function useGroupForm(group) {
  const initial = useMemo(() => toFormState(group), [group]);
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState({});
  const [source, setSource] = useState(initial);

  // Groupe rechargé (après enregistrement) : on repart de la version serveur
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
    if (!form.name.trim()) errors.name = 'Le nom du groupe est requis.';
    if (form.roles.some((r) => !r.name.trim())) errors.roles = 'Chaque rôle doit avoir un nom.';
    return errors;
  };

  const toSubmit = (universeId) => {
    const values = {
      universe_id: universeId,
      name: form.name.trim(),
      description: form.description,
      groupTypeId: toNullableId(form.groupTypeId),
      parentId: toNullableId(form.parentId),
      roles: form.roles.map((r) => ({ ...r, name: r.name.trim() })),
      characters: form.members.filter((m) => m.characterId).map((m) => ({ characterId: m.characterId, role: m.role || fallbackRole(form.roles) })),
      placeIds: form.placeIds,
      colors: Object.values(form.colors).some(Boolean) ? form.colors : null,
      backgroundColor: form.backgroundMode === 'color' ? form.backgroundColor : null,
    };
    // Fond : l'image n'est gardée qu'en mode « Image »
    const imgs = { ...images };
    if (form.backgroundMode !== 'image') {
      if (group?.background) imgs.background = null;
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
