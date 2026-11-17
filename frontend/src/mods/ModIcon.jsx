import { createElement } from 'react';
import { modIcon } from './modIcons';

/** Icône désignée par son nom dans un manifeste de mod (voir modIcons.js). */
export function ModIcon({ name, ...props }) {
  return createElement(modIcon(name), props);
}
