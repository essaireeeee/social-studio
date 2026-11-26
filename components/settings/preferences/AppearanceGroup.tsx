"use client";

import { useTheme } from "next-themes";
import { FormGroup } from "@/components/ui/form-group";
import { useMounted } from "@/hooks/useMounted";
import { Segmented } from "@/components/ui/segmented";
import { THEME_CHOICES, THEME_LABELS, isThemeChoice, type ThemeChoice } from "@/lib/design/theme";

/**
 * Apparence (section 5.1) : Jour, Nuit ou Automatique (suit le système). Appliquée tout de
 * suite et mémorisée sur cet appareil, comme le réglage d'iOS (hors sauvegardes).
 */
export function AppearanceGroup() {
  const { theme, setTheme } = useTheme();
  // Choix mémorisé dans le navigateur : lu après l'hydratation.
  const mounted = useMounted();
  const value: ThemeChoice = mounted && isThemeChoice(theme) ? theme : "system";
  return (
    <FormGroup
      title="Apparence"
      footer="Automatique suit le réglage du système. Le choix est propre à cet appareil."
    >
      <Segmented
        label="Thème"
        value={value}
        onChange={setTheme}
        options={THEME_CHOICES.map((choice) => ({ value: choice, label: THEME_LABELS[choice] }))}
      />
    </FormGroup>
  );
}
