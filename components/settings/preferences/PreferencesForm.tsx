"use client";

import type { ReactNode } from "react";
import { VARIANT_LABELS } from "@/components/editor/VariantCard";
import { FormField } from "@/components/ui/form-field";
import { FormGroup, SwitchRow } from "@/components/ui/form-group";
import { Picker } from "@/components/ui/picker";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { QUICK_OPTION_LABELS, moveItem, type QuickOptionKey } from "@/lib/settings/preferences";
import { RetrievalWeightsSchema, type Settings } from "@/types/domain";
import { LogoField } from "./LogoField";
import { OptionListEditor } from "./OptionListEditor";
import { OrderList } from "./OrderList";

const WEIGHT_LABELS: Record<keyof Settings["retrievalWeights"], string> = {
  sameCategory: "Même catégorie",
  fighterOverlap: "Combattants communs",
  sameEvent: "Même événement",
  textSimilarity: "Similarité du texte",
  samePlatform: "Même plateforme",
  recency: "Fraîcheur",
  usedRecently: "Pénalité : déjà utilisée",
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <FormGroup title={title}>{children}</FormGroup>;
}

interface PreferencesFormProps {
  values: Settings;
  errors: Record<string, string>;
  onChange: (patch: Partial<Settings>) => void;
}

export function PreferencesForm({ values, errors, onChange }: PreferencesFormProps) {
  const number = (key: "igTruncation" | "fbTruncation", label: string, hint: string) => (
    <FormField id={`pref-${key}`} label={label} hint={hint} error={errors[key]}>
      <Input
        id={`pref-${key}`}
        type="number"
        value={values[key]}
        aria-invalid={Boolean(errors[key]) || undefined}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
      />
    </FormField>
  );

  return (
    <>
      <Block title="Compte">
        <LogoField />
        <FormField
          id="pref-account"
          label="Nom de compte affiché dans l'aperçu"
          error={errors.accountName}
        >
          <Input
            id="pref-account"
            value={values.accountName}
            onChange={(e) => onChange({ accountName: e.target.value })}
          />
        </FormField>
      </Block>
      <Block title="Aperçu">
        <div className="grid gap-3 sm:grid-cols-2">
          {number("igTruncation", "Coupure Instagram (« … plus »)", "Entre 60 et 300 caractères.")}
          {number(
            "fbTruncation",
            "Coupure Facebook (« Voir plus »)",
            "Entre 100 et 2 000 caractères.",
          )}
        </div>
      </Block>
      <Block title="Options rapides du Studio">
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(QUICK_OPTION_LABELS) as QuickOptionKey[]).map((key) => (
            <OptionListEditor
              key={key}
              label={QUICK_OPTION_LABELS[key]}
              values={values.quickOptions[key]}
              onChange={(list) =>
                onChange({ quickOptions: { ...values.quickOptions, [key]: list } })
              }
            />
          ))}
        </div>
      </Block>
      <Block title="Génération">
        <OrderList
          label="Ordre des variantes"
          items={values.variantOrder.map((kind) => ({ id: kind, label: VARIANT_LABELS[kind] }))}
          onMove={(from, to) => onChange({ variantOrder: moveItem(values.variantOrder, from, to) })}
        />
        <SwitchRow
          id="pref-french-spacing"
          label="Espaces insécables avant ! ? : ;"
          hint="Typographie française, appliquée à tous les textes."
          control={
            <Switch
              aria-labelledby="pref-french-spacing"
              checked={values.frenchSpacing}
              onCheckedChange={(checked) => onChange({ frenchSpacing: checked })}
            />
          }
        />
        <FormField id="pref-shortcut" label="Raccourci « Copier la variante affichée »">
          <Picker
            id="pref-shortcut"
            value={values.copyShortcut}
            onChange={(e) => onChange({ copyShortcut: e.target.value as Settings["copyShortcut"] })}
          >
            <option value="mod+shift+c">Ctrl (Cmd) + Maj + C</option>
            <option value="mod+alt+c">Ctrl (Cmd) + Alt + C</option>
          </Picker>
        </FormField>
      </Block>
      <details className="rounded-xl bg-card p-4 squircle">
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Avancé : poids de la recherche de références
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(WEIGHT_LABELS) as (keyof Settings["retrievalWeights"])[]).map((key) => (
            <FormField key={key} id={`weight-${key}`} label={WEIGHT_LABELS[key]}>
              <Input
                id={`weight-${key}`}
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={values.retrievalWeights[key]}
                onChange={(e) =>
                  onChange({
                    retrievalWeights: { ...values.retrievalWeights, [key]: Number(e.target.value) },
                  })
                }
              />
            </FormField>
          ))}
          <button
            type="button"
            className="self-end text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => onChange({ retrievalWeights: RetrievalWeightsSchema.parse({}) })}
          >
            Rétablir les poids par défaut
          </button>
        </div>
      </details>
    </>
  );
}
