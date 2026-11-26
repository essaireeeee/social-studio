"use client";

import { useSyncExternalStore } from "react";
import { readStored, writeStored } from "@/lib/shell/shortcuts";

export const PREVIEW_THEME_KEY = "hex-preview-theme";
export type PreviewTheme = "light" | "dark";

const EVENT = "hex-preview-theme";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const read = (): PreviewTheme => (readStored(PREVIEW_THEME_KEY) === "light" ? "light" : "dark");

/**
 * Apparence simulée du réseau dans l'aperçu (section 5.1) : le CM vérifie son texte dans
 * l'application Instagram en clair comme en sombre, quel que soit le thème du Studio.
 * Mémorisée sur l'appareil ; sombre par défaut (rendu V1).
 */
export function usePreviewTheme(): [PreviewTheme, (theme: PreviewTheme) => void] {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as const);
  const update = (next: PreviewTheme) => {
    writeStored(PREVIEW_THEME_KEY, next);
    window.dispatchEvent(new Event(EVENT));
  };
  return [theme, update];
}
