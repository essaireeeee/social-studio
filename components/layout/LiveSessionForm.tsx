"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRepository } from "@/hooks/useRepository";
import { formatDate } from "@/lib/format";
import { eventLabelOf } from "@/lib/generation/native/context";
import {
  inputFromEvent,
  validateSessionInput,
  type LiveSessionInput,
  type LiveSessionValues,
} from "@/lib/shell/live-session";

type Field = Exclude<keyof LiveSessionInput, "eventId">;

const FIELDS: {
  key: Field;
  label: string;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric";
}[] = [
  { key: "eventName", label: "Nom de l'événement", placeholder: "HEXAGONE MMA" },
  { key: "eventNumber", label: "Numéro", inputMode: "numeric", placeholder: "12" },
  { key: "venue", label: "Salle" },
  { key: "city", label: "Ville" },
  { key: "date", label: "Date", type: "date" },
  { key: "broadcast", label: "Diffusion" },
  { key: "ticketing", label: "Billetterie", placeholder: "Lien ou indication" },
];

interface LiveSessionFormProps {
  initial: LiveSessionInput;
  submitLabel: string;
  onSubmit: (values: LiveSessionValues) => Promise<void>;
  onCancel: () => void;
}

/** Formulaire de Session Live : choix d'un événement en base (pré-remplit tout) ou saisie rapide. */
export function LiveSessionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: LiveSessionFormProps) {
  const id = useId();
  const repository = useRepository();
  const events = useLiveQuery(
    async () =>
      repository
        ? (await repository.events.list()).sort((a, b) =>
            (b.date ?? "").localeCompare(a.date ?? ""),
          )
        : [],
    [repository],
  );
  const broadcasters = useLiveQuery(
    async () =>
      repository
        ? (await repository.getSettings()).quickOptions.broadcasters.filter(
            (b) => !["Autre", "Aucun"].includes(b),
          )
        : [],
    [repository],
  );
  const [values, setValues] = useState<LiveSessionInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: Field, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const pickEvent = (eventId: string) => {
    const event = events?.find((e) => e.id === eventId);
    setValues(event ? inputFromEvent(event) : { eventName: "" });
    setErrors({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateSessionInput(values);
    if (!result.ok) {
      setErrors(result.errors);
      document.getElementById(`${id}-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit(result.values);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-event`} className="text-xs font-medium text-muted-foreground">
          Événement de la base
        </label>
        {events && events.length > 0 ? (
          <select
            id={`${id}-event`}
            value={values.eventId ?? ""}
            onChange={(e) => pickEvent(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-13"
          >
            <option value="">Saisie rapide (aucun événement choisi)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {eventLabelOf(e.name, e.number)}
                {e.date ? ` · ${formatDate(e.date)}` : ""}
                {e.city ? ` · ${e.city}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-13 text-muted-foreground">
            Aucun événement en base : saisie rapide ci-dessous.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const error = errors[field.key];
          const value = values[field.key];
          return (
            <div
              key={field.key}
              className={
                field.key === "eventName"
                  ? "flex flex-col gap-1.5 sm:col-span-2"
                  : "flex flex-col gap-1.5"
              }
            >
              <label
                htmlFor={`${id}-${field.key}`}
                className="text-xs font-medium text-muted-foreground"
              >
                {field.label}
                {field.key === "eventName" ? " *" : ""}
              </label>
              <Input
                id={`${id}-${field.key}`}
                type={field.type ?? "text"}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                list={field.key === "broadcast" ? `${id}-broadcasters` : undefined}
                value={value === undefined ? "" : String(value)}
                onChange={(e) => set(field.key, e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-${field.key}-error` : undefined}
                required={field.key === "eventName"}
              />
              {error ? (
                <p id={`${id}-${field.key}-error`} className="text-xs text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
        <datalist id={`${id}-broadcasters`}>
          {(broadcasters ?? []).map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>

      <p className="text-xs text-muted-foreground">
        Seul le nom est obligatoire. Les champs vides n&apos;apparaîtront dans aucun texte.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
