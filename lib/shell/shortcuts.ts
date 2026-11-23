/**
 * Raccourcis globaux du shell (section 12.2) et script exécuté avant le premier affichage.
 * Logique pure.
 */
import type { Mode } from "@/types/domain";

export const MODE_STORAGE_KEY = "hex-mode";
export const SIDEBAR_STORAGE_KEY = "hex-sidebar";

/** Forme minimale d'un événement clavier (testable sans DOM). */
export interface KeyLike {
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/** `Alt+L` : LIVE SHOW, `Alt+D` : DAILY & MEDIA. `code` plutôt que `key` : Alt modifie la lettre sur macOS. */
export function modeFromShortcut(event: KeyLike): Mode | null {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (event.code === "KeyL") return "live";
  if (event.code === "KeyD") return "daily";
  return null;
}

/** `Cmd+K` (macOS) ou `Ctrl+K` : palette de commandes. */
export function isCommandShortcut(event: KeyLike): boolean {
  return (
    (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.code === "KeyK"
  );
}

/**
 * Exécuté pendant la lecture du HTML, avant l'affichage : rétablit le mode et l'état de la
 * barre latérale mémorisés, sans flash de couleur ni saut de mise en page.
 */
export const PREPAINT_SCRIPT = `(function(){try{var d=document.documentElement;var m=localStorage.getItem("${MODE_STORAGE_KEY}");if(m==="live"||m==="daily")d.setAttribute("data-mode",m);if(localStorage.getItem("${SIDEBAR_STORAGE_KEY}")==="collapsed")d.setAttribute("data-sidebar","collapsed")}catch(e){}})()`;

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée stricte) : l'état reste en mémoire.
  }
}
