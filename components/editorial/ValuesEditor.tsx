"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ValuesEditorProps {
  values: string[];
  disabled: boolean;
  label: string;
  onChange: (values: string[]) => void;
}

/** Liste éditable de valeurs (formules interdites, qualificatifs, lexique...). */
export function ValuesEditor({ values, disabled, label, onChange }: ValuesEditorProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {values.map((value) => (
          <li
            key={value}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-elevated py-0.5 pr-1 pl-2 text-xs"
          >
            {value}
            {disabled ? null : (
              <button
                type="button"
                className="cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:bg-subtle hover:text-foreground"
                aria-label={`Retirer « ${value} »`}
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {disabled ? null : (
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="Ajouter une valeur"
            aria-label={`Ajouter à : ${label}`}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <Button variant="secondary" onClick={add} disabled={!draft.trim()}>
            Ajouter
          </Button>
        </div>
      )}
    </div>
  );
}
