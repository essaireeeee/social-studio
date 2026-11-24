"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SCOPE_LABELS,
  newBroadcaster,
  type BroadcastScope,
  type BroadcasterRow,
  type EventFormErrors,
} from "@/lib/events/form";

interface BroadcastersEditorProps {
  rows: BroadcasterRow[];
  confirmed: boolean;
  warning?: string;
  errors: EventFormErrors;
  onChange: (rows: BroadcasterRow[]) => void;
  onConfirmed: (confirmed: boolean) => void;
}

/** Diffuseurs, chaînes et horaires ; « Horaires confirmés » conditionne leur usage. */
export function BroadcastersEditor(props: BroadcastersEditorProps) {
  const { rows, errors } = props;
  const patch = (key: string, value: Partial<BroadcasterRow>) =>
    props.onChange(rows.map((r) => (r.key === key ? { ...r, ...value } : r)));

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const n = i + 1;
        const nameError = errors[`${row.key}-name`];
        const timeError = errors[`${row.key}-startTime`];
        return (
          <div
            key={row.key}
            className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_1fr_6rem_10rem_auto]"
          >
            <Input
              aria-label={`Diffuseur ${n}`}
              placeholder="Diffuseur"
              value={row.name}
              aria-invalid={Boolean(nameError) || undefined}
              onChange={(e) => patch(row.key, { name: e.target.value })}
            />
            <Input
              aria-label={`Chaîne du diffuseur ${n}`}
              placeholder="Chaîne (facultatif)"
              value={row.channel}
              onChange={(e) => patch(row.key, { channel: e.target.value })}
            />
            <Input
              aria-label={`Horaire du diffuseur ${n}`}
              placeholder="20h30"
              value={row.startTime}
              aria-invalid={Boolean(timeError) || undefined}
              onChange={(e) => patch(row.key, { startTime: e.target.value })}
            />
            <select
              aria-label={`Partie diffusée par le diffuseur ${n}`}
              value={row.scope}
              onChange={(e) => patch(row.key, { scope: e.target.value as BroadcastScope })}
              className="h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground"
            >
              {(Object.keys(SCOPE_LABELS) as BroadcastScope[]).map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Retirer le diffuseur ${n}`}
              onClick={() => props.onChange(rows.filter((r) => r.key !== row.key))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
            {nameError || timeError ? (
              <p className="text-xs text-danger sm:col-span-5">{nameError ?? timeError}</p>
            ) : null}
          </div>
        );
      })}
      <Button
        size="sm"
        variant="secondary"
        className="self-start"
        onClick={() => props.onChange([...rows, newBroadcaster()])}
      >
        <Plus aria-hidden="true" />
        Ajouter un diffuseur
      </Button>
      <label className="flex items-start gap-2 text-13">
        <input
          type="checkbox"
          checked={props.confirmed}
          onChange={(e) => props.onConfirmed(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span>
          Horaires confirmés
          <span className="block text-xs text-muted-foreground">
            Décoché : aucun horaire n&apos;apparaît dans les textes ni dans les signatures.
          </span>
        </span>
      </label>
      {props.warning ? <p className="text-xs text-warning">{props.warning}</p> : null}
    </div>
  );
}
