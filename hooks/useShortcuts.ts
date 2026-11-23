"use client";

import { useEffect } from "react";
import { isCommandShortcut, modeFromShortcut } from "@/lib/shell/shortcuts";
import { useUiStore } from "@/stores/ui.store";
import type { Mode } from "@/types/domain";

/** Raccourcis globaux : `Alt+L` / `Alt+D` (mode), `Cmd/Ctrl+K` (palette). */
export function useShortcuts(setMode: (mode: Mode) => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (isCommandShortcut(event)) {
        event.preventDefault();
        const ui = useUiStore.getState();
        ui.setCommandOpen(!ui.commandOpen);
        return;
      }
      const mode = modeFromShortcut(event);
      if (mode) {
        event.preventDefault();
        setMode(mode);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setMode]);
}
