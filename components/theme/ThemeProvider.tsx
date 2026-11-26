"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { THEME_COLORS, THEME_STORAGE_KEY, type ResolvedTheme } from "@/lib/design/theme";

/** Aligne `<meta name="theme-color">` sur le thème affiché (barre d'état, barre d'onglets). */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    const color = THEME_COLORS[resolvedTheme as ResolvedTheme];
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", color);
    }
  }, [resolvedTheme]);
  return null;
}

/**
 * Thèmes Jour, Nuit, Automatique (section 5.1). `data-theme` est posé sur <html> avant
 * l'affichage par le script d'en-tête du layout, puis tenu à jour par `next-themes`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      storageKey={THEME_STORAGE_KEY}
      defaultTheme="system"
      enableSystem
      enableColorScheme
      themes={["light", "dark"]}
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}
