"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Faux au rendu serveur et pendant l'hydratation, vrai ensuite. Pour une valeur connue du
 * seul navigateur (thème mémorisé…) sans écart d'hydratation.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
