"use client";

import { FormField, describedBy } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FighterFormErrors, FighterFormValues } from "@/lib/fighters/form";

type TextKey = Exclude<keyof FighterFormValues, "fightHistory">;

interface FighterFieldsProps {
  values: FighterFormValues;
  errors: FighterFormErrors;
  update: (patch: Partial<FighterFormValues>) => void;
}

/** Identité, palmarès daté et textes de la fiche. */
export function FighterFields({ values, errors, update }: FighterFieldsProps) {
  const text = (key: TextKey, label: string, options: { hint?: string; type?: string } = {}) => {
    const id = `fighter-${key}`;
    return (
      <FormField id={id} label={label} hint={options.hint} error={errors[key]}>
        <Input
          id={id}
          type={options.type}
          inputMode={["wins", "losses", "draws", "nc"].includes(key) ? "numeric" : undefined}
          value={values[key]}
          aria-invalid={Boolean(errors[key]) || undefined}
          aria-describedby={describedBy(id, errors[key], options.hint)}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      </FormField>
    );
  };
  const area = (key: "bio" | "editorialNotes" | "internalNotes", label: string, hint?: string) => (
    <FormField id={`fighter-${key}`} label={label} hint={hint}>
      <Textarea
        id={`fighter-${key}`}
        rows={3}
        autoResize
        value={values[key]}
        aria-describedby={hint ? `fighter-${key}-hint` : undefined}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </FormField>
  );

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Identité
        </legend>
        {text("firstName", "Prénom")}
        {text("lastName", "Nom")}
        {text("nickname", "Surnom")}
        {text("nationality", "Nationalité")}
        {text("weightClass", "Catégorie de poids")}
        {text("club", "Club")}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Palmarès
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {text("wins", "Victoires")}
          {text("losses", "Défaites")}
          {text("draws", "Nuls")}
          {text("nc", "Sans décision")}
          {text("recordAsOf", "Exact au", { type: "date" })}
        </div>
        <p className="text-xs text-muted-foreground">
          Toujours daté. Les moteurs ne l&apos;utilisent que si « Utiliser le palmarès » est coché
          dans le brief.
        </p>
      </fieldset>
      {area("bio", "Biographie", "Seules les informations vérifiées : les moteurs la reprennent.")}
      {area(
        "editorialNotes",
        "Consignes de rédaction",
        "Ex. : comment présenter ce combattant dans les textes.",
      )}
      {area("internalNotes", "Notes internes")}
    </div>
  );
}
