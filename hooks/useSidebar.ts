"use client";

import { useCallback, useEffect } from "react";
import { SIDEBAR_STORAGE_KEY, writeStored } from "@/lib/shell/shortcuts";
import { useUiStore } from "@/stores/ui.store";

/**
 * Barre latérale repliable, état mémorisé dans localStorage (section 12.1). L'attribut
 * `data-sidebar` posé avant l'affichage règle la largeur sans saut de mise en page.
 */
export function useSidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    useUiStore
      .getState()
      .setSidebarCollapsed(document.documentElement.dataset.sidebar === "collapsed");
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    useUiStore.getState().setSidebarCollapsed(next);
    if (next) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    writeStored(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
  }, []);

  return { collapsed, setCollapsed, toggle: () => setCollapsed(!collapsed) };
}
