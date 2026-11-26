"use client";

import { useSyncExternalStore } from "react";

/** Points de rupture V2 (section 5.5) : tab bar sous 768 px, sidebar dès 1024 px. */
export const MOBILE_QUERY = "(max-width: 767.98px)";
export const DESKTOP_QUERY = "(min-width: 1024px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribers = new Map<string, (onChange: () => void) => () => void>();

/** Une fonction d'abonnement stable par requête (sinon React se réabonne à chaque rendu). */
function subscribe(query: string) {
  let fn = subscribers.get(query);
  if (!fn) {
    fn = (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    };
    subscribers.set(query, fn);
  }
  return fn;
}

/**
 * Vrai si la requête média correspond. Côté serveur et au premier rendu hydraté : `fallback`.
 * Ne pas s'en servir pour un rendu visible dès le chargement (préférer les classes CSS).
 */
export function useMedia(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const useIsMobile = () => useMedia(MOBILE_QUERY);
export const useReducedMotion = () => useMedia(REDUCED_MOTION_QUERY);
