"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/useMounted";
import { toggledTheme, type ResolvedTheme } from "@/lib/design/theme";
import { cn } from "@/lib/utils";

/**
 * Bouton rapide soleil / lune (section 5.1) : bascule vers le thème opposé à celui affiché.
 * Le choix « Automatique » se retrouve dans Paramètres > Préférences > Apparence.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Thème lu après l'hydratation ; avant, les icônes suivent `data-theme` en CSS.
  const mounted = useMounted();
  const current: ResolvedTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const next = toggledTheme(current);
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cn(
        "flex size-9 cursor-pointer items-center justify-center rounded-full text-accent-text hover:bg-fill active:opacity-60 pointer-coarse:size-11",
        className,
      )}
      aria-label={next === "dark" ? "Passer en thème Nuit" : "Passer en thème Jour"}
    >
      <Sun className="size-5 [[data-theme=light]_&]:hidden" aria-hidden="true" />
      <Moon className="size-5 [[data-theme=dark]_&]:hidden" aria-hidden="true" />
    </button>
  );
}
