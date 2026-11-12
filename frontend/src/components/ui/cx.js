/** Concatène des classes en ignorant les valeurs falsy. */
export const cx = (...classes) => classes.filter(Boolean).join(' ');
