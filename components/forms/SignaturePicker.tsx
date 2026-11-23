"use client";

import type { Signature } from "@/types/domain";

interface SignaturePickerProps {
  signatures: readonly Signature[];
  value?: string;
  /** Champs requis manquants pour la signature retenue (libellés : « date », « salle »). */
  missing: readonly string[];
  needsConfirmedSchedule: boolean;
  onChange: (id: string | null) => void;
}

/** Signature : « Aucune » ou une signature du mode ; incomplète, elle n'est pas ajoutée. */
export function SignaturePicker({
  signatures,
  value,
  missing,
  needsConfirmedSchedule,
  onChange,
}: SignaturePickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <select
        id="field-signature"
        aria-label="Signature"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-13"
      >
        <option value="">Aucune</option>
        {signatures.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {value && missing.length > 0 ? (
        <p className="text-xs text-warning" role="status">
          Signature incomplète : {missing.join(", ")}{" "}
          {missing.length > 1 ? "manquantes" : "manquante"}. Elle ne sera pas ajoutée.
        </p>
      ) : null}
      {value && needsConfirmedSchedule ? (
        <p className="text-xs text-warning" role="status">
          Horaires non confirmés pour cet événement : la signature ne sera pas ajoutée.
        </p>
      ) : null}
    </div>
  );
}
