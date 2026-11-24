"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newLink, type EventFormErrors, type LinkRow } from "@/lib/events/form";

/** Liens utiles de l'événement (page officielle, réseaux…). */
export function LinksEditor({
  rows,
  errors,
  onChange,
}: {
  rows: LinkRow[];
  errors: EventFormErrors;
  onChange: (rows: LinkRow[]) => void;
}) {
  const patch = (key: string, value: Partial<LinkRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...value } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={row.key} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
          <Input
            aria-label={`Libellé du lien ${i + 1}`}
            placeholder="Libellé"
            value={row.label}
            aria-invalid={Boolean(errors[`${row.key}-label`]) || undefined}
            onChange={(e) => patch(row.key, { label: e.target.value })}
          />
          <Input
            type="url"
            aria-label={`Adresse du lien ${i + 1}`}
            placeholder="https://"
            value={row.url}
            aria-invalid={Boolean(errors[`${row.key}-url`]) || undefined}
            onChange={(e) => patch(row.key, { url: e.target.value })}
          />
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Retirer le lien ${i + 1}`}
            onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        className="self-start"
        onClick={() => onChange([...rows, newLink()])}
      >
        <Plus aria-hidden="true" />
        Ajouter un lien
      </Button>
    </div>
  );
}
