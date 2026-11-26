"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MOBILE_QUERY } from "@/hooks/useMedia";
import { parentOf } from "@/lib/shell/navigation";
import { useUiStore } from "@/stores/ui.store";

const EDGE_PX = 24;
const SWIPE_PX = 80;

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return (
    target instanceof HTMLInputElement &&
    !["checkbox", "radio", "button", "submit", "range", "file"].includes(target.type)
  );
}

/**
 * Gestes du shell sur mobile :
 * - clavier virtuel : un champ actif masque la tab bar (section 5.8) ;
 * - retour par glissement depuis le bord gauche (section 5.6), seulement dans l'application
 *   installée : dans Safari, le navigateur fournit déjà ce geste.
 */
export function useShellGestures() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const mobile = () => window.matchMedia(MOBILE_QUERY).matches;
    const onFocusIn = (event: FocusEvent) => {
      if (mobile() && isEditable(event.target)) useUiStore.getState().setKeyboardOpen(true);
    };
    const onFocusOut = () => {
      // Le focus peut passer d'un champ à l'autre : on vérifie après coup.
      window.setTimeout(() => {
        if (!isEditable(document.activeElement)) useUiStore.getState().setKeyboardOpen(false);
      }, 50);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    let start: { x: number; y: number } | null = null;
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = touch && touch.clientX <= EDGE_PX ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      start = null;
      const parent = parentOf(pathname, window.matchMedia(MOBILE_QUERY).matches);
      if (dx > SWIPE_PX && dy < 60 && parent) router.push(parent.href);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pathname, router]);
}
