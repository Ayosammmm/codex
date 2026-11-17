/** Accords du nom du type : « Nouvel artefact » / « Nouvelle relique ». */
export const typeNoun = (type) => ({
  new: `${type.feminine ? 'Nouvelle' : /^[aeiouyéèêh]/i.test(type.label) ? 'Nouvel' : 'Nouveau'} ${type.label.toLowerCase()}`,
  this: `${type.feminine ? 'cette' : /^[aeiouyéèêh]/i.test(type.label) ? 'cet' : 'ce'} ${type.label.toLowerCase()}`,
  done: (verb) => `${verb}${type.feminine ? 'e' : ''}`,
});
