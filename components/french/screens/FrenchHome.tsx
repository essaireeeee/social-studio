"use client";

import {
  BarChart3,
  BookOpenCheck,
  Dumbbell,
  Info,
  Library,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { copyText } from "@/components/editor/VariantActions";
import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Button } from "@/components/ui/button";
import { FormGroup } from "@/components/ui/form-group";
import { Cell, GroupedSection } from "@/components/ui/grouped-list";
import { useFrenchSources } from "@/hooks/useFrenchContext";
import { buildCheckContext } from "@/lib/french/context";
import { autoCorrect } from "@/lib/french/engine";
import type { IconColor } from "@/lib/design/icon-colors";
import { FRENCH_SECTIONS } from "@/lib/shell/navigation";
import { FrenchTextField } from "../FrenchTextField";

const LOOK: Record<string, { icon: LucideIcon; color: IconColor; subtitle: string }> = {
  stats: { icon: BarChart3, color: "orange", subtitle: "Les règles où vous vous trompez le plus" },
  training: {
    icon: Dumbbell,
    color: "green",
    subtitle: "Séries de 10 exercices, tirés de vos erreurs",
  },
  rules: {
    icon: BookOpenCheck,
    color: "indigo",
    subtitle: "Toutes les règles, par famille et niveau",
  },
  dictionary: { icon: Library, color: "blue", subtitle: "Noms et mots jamais signalés" },
  settings: { icon: Settings2, color: "gray", subtitle: "Couches actives et règles maison" },
  about: { icon: Info, color: "teal", subtitle: "Comment le correcteur fonctionne" },
};

/** Atelier Français (section 6.5) : vérifier un texte, puis les sous-pages. */
export function FrenchHome() {
  const [text, setText] = useState("");
  const sources = useFrenchSources();

  const copyCorrected = () => {
    if (!sources) return;
    const corrected = autoCorrect(text, buildCheckContext(sources));
    if (corrected !== text) setText(corrected);
    void copyText(corrected, sources.settings.french.socialCompat);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Atelier Français</LargeTitle>
        <p className="text-subheadline text-muted-foreground">
          Orthographe, grammaire, accords et typographie, vérifiés hors ligne avant chaque
          publication.
        </p>
      </header>

      <FormGroup
        title="Vérifier un texte"
        footer="Collez n'importe quel texte : mail presse, communiqué, légende écrite ailleurs. Rien n'est envoyé si les couches optionnelles sont coupées."
      >
        <FrenchTextField
          aria-label="Texte à vérifier"
          autoResize
          rows={6}
          value={text}
          onValueChange={setText}
          placeholder="Collez ou écrivez votre texte ici"
          className="text-body"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyCorrected} disabled={!text.trim() || !sources}>
            Copier le texte corrigé
          </Button>
          <Button variant="secondary" onClick={() => setText("")} disabled={!text}>
            Effacer
          </Button>
        </div>
      </FormGroup>

      <GroupedSection id="atelier" header="Atelier">
        {FRENCH_SECTIONS.map((section) => {
          const look = LOOK[section.id]!;
          return (
            <Cell
              key={section.id}
              title={section.label}
              subtitle={look.subtitle}
              icon={look.icon}
              iconColor={look.color}
              href={section.href}
            />
          );
        })}
      </GroupedSection>
    </div>
  );
}
