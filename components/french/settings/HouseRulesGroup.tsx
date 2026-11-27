"use client";

import { FormGroup, SwitchRow } from "@/components/ui/form-group";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import type { Settings } from "@/types/domain";
import type { FrenchPrefsPatch } from "./useFrenchPrefs";

type Prefs = Settings["french"];

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-body">{label}</span>
      <Segmented
        label={label}
        value={value}
        options={options}
        onChange={onChange}
        className="sm:w-72 sm:shrink-0"
      />
    </div>
  );
}

/** Règles maison : heures, apostrophe, nombres, compatibilité réseaux sociaux, anglicismes. */
export function HouseRulesGroup({
  prefs,
  onChange,
}: {
  prefs: Prefs;
  onChange: (patch: FrenchPrefsPatch) => void;
}) {
  return (
    <FormGroup
      title="Règles maison"
      footer="Ces choix s'appliquent à toutes les vérifications et à la correction des sorties IA."
    >
      <Choice
        label="Format des heures"
        value={prefs.hourFormat}
        options={[
          { value: "21h", label: "21h" },
          { value: "21 h", label: "21 h" },
        ]}
        onChange={(hourFormat) => onChange({ hourFormat })}
      />
      <Choice
        label="Apostrophe"
        value={prefs.apostrophe}
        options={[
          { value: "straight", label: "Droite '" },
          { value: "curly", label: "Typographique ’" },
        ]}
        onChange={(apostrophe) => onChange({ apostrophe })}
      />
      <Choice
        label="Nombres"
        value={prefs.numbers}
        options={[
          { value: "digits", label: "Chiffres" },
          { value: "letters", label: "Lettres" },
        ]}
        onChange={(numbers) => onChange({ numbers })}
      />
      <SwitchRow
        id="pref-social"
        label="Compatibilité réseaux sociaux"
        hint="À la copie, l'espace fine est remplacée par une espace insécable : certaines applications affichent mal l'espace fine."
        control={
          <Switch
            checked={prefs.socialCompat}
            onCheckedChange={(socialCompat) => onChange({ socialCompat })}
            aria-labelledby="pref-social"
          />
        }
      />
      <SwitchRow
        id="pref-anglicisms"
        label="Proposer un équivalent aux anglicismes"
        hint="Les termes consacrés du MMA (main event, fight card, face-off) restent toujours acceptés."
        control={
          <Switch
            checked={prefs.anglicismHints}
            onCheckedChange={(anglicismHints) => onChange({ anglicismHints })}
            aria-labelledby="pref-anglicisms"
          />
        }
      />
      <SwitchRow
        id="pref-rule-of-day"
        label="Règle du jour sur l'Accueil"
        control={
          <Switch
            checked={prefs.ruleOfTheDay}
            onCheckedChange={(ruleOfTheDay) => onChange({ ruleOfTheDay })}
            aria-labelledby="pref-rule-of-day"
          />
        }
      />
    </FormGroup>
  );
}
