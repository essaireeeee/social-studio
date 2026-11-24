"use client";

import { FormField, describedBy } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { EventFormErrors, EventFormValues } from "@/lib/events/form";

type InfoKey = "name" | "number" | "date" | "city" | "venue" | "address" | "ticketingUrl";

interface EventInfoFieldsProps {
  values: EventFormValues;
  errors: EventFormErrors;
  update: (patch: Partial<EventFormValues>) => void;
}

/** Nom, numéro, date, lieu et billetterie de l'événement. */
export function EventInfoFields({ values, errors, update }: EventInfoFieldsProps) {
  const field = (key: InfoKey, label: string, options: { type?: string; hint?: string } = {}) => {
    const id = `event-${key}`;
    return (
      <FormField id={id} label={label} hint={options.hint} error={errors[key]}>
        <Input
          id={id}
          type={options.type}
          inputMode={key === "number" ? "numeric" : undefined}
          value={values[key]}
          aria-invalid={Boolean(errors[key]) || undefined}
          aria-describedby={describedBy(id, errors[key], options.hint)}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      </FormField>
    );
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field("name", "Nom")}
      {field("number", "Numéro")}
      {field("date", "Date", { type: "date" })}
      {field("city", "Ville")}
      {field("venue", "Salle")}
      {field("address", "Adresse")}
      <div className="sm:col-span-2">
        {field("ticketingUrl", "Lien billetterie", { type: "url" })}
      </div>
    </div>
  );
}
