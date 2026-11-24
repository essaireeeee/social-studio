"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addOption, moveItem } from "@/lib/settings/preferences";

interface OptionListEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}

/** Options rapides du Studio : ajout, ordre, retrait (section 16.3). */
export function OptionListEditor({ label, values, onChange }: OptionListEditorProps) {
  const [draft, setDraft] = useState("");
  const add = () => {
    onChange(addOption(values, draft));
    setDraft("");
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs text-muted-foreground">{label}</legend>
      <ol className="flex flex-col gap-1" aria-label={label}>
        {values.map((value, i) => (
          <li
            key={value}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-13"
          >
            <span className="flex-1">{value}</span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Monter ${value}`}
              disabled={i === 0}
              onClick={() => onChange(moveItem(values, i, i - 1))}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Descendre ${value}`}
              disabled={i === values.length - 1}
              onClick={() => onChange(moveItem(values, i, i + 1))}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Retirer ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <Input
          aria-label={`Nouvelle option : ${label}`}
          value={draft}
          placeholder="Ajouter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button size="sm" variant="secondary" onClick={add} disabled={!draft.trim()}>
          <Plus aria-hidden="true" />
          Ajouter
        </Button>
      </div>
    </fieldset>
  );
}
