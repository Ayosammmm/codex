const Univers = require('../models/Univers');
const { getManifest } = require('./modStore');
const { httpError } = require('./modManifest');

/**
 * Manifeste d'un mod installé ET actif dans l'univers donné ; erreur 400 sinon.
 * (Les écritures de données d'un mod ne sont possibles que dans un univers où il est activé.)
 */
async function activeManifest(universeId, modId) {
  const manifest = await getManifest(modId);
  if (!manifest) throw httpError(`Le mod « ${modId} » n'est pas installé.`);
  const universe = await Univers.findByPk(universeId, { attributes: ['id', 'mods'] });
  if (!universe) throw httpError('Univers introuvable.', 404);
  if (universe.mods?.[modId] !== true) throw httpError(`Le mod « ${manifest.name} » n'est pas activé dans cet univers.`);
  return manifest;
}

/** Type d'entité d'un manifeste ; erreur 400 s'il n'existe pas. */
function entityTypeOf(manifest, typeKey) {
  const type = manifest.entityTypes.find((t) => t.key === typeKey);
  if (!type) throw httpError(`Le mod « ${manifest.name} » ne déclare pas de type « ${typeKey} ».`);
  return type;
}

module.exports = { activeManifest, entityTypeOf };
