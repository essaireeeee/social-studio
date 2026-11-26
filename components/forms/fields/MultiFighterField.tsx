"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { Fighter } from "@/types/domain";
import { FighterCombobox } from "./FighterCombobox";

interface MultiFighterFieldProps {
  id: string;
  label: string;
  value: string[];
  fighters: readonly Fighter[];
  priorityIds?: readonly string[];
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string[] | undefined) => void;
}

/** Plusieurs combattants : chaque choix s'ajoute à la liste, retirable. */
export function MultiFighterField({ value, onChange, ...props }: MultiFighterFieldProps) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${props.label} choisis`}>
          {value.map((name) => (
            <li
              key={name}
              className="flex items-center gap-1 rounded-md border border-border bg-elevated py-0.5 pr-1 pl-2 text-xs"
            >
              {name}
              <button
                type="button"
                aria-label={`Retirer ${name}`}
                onClick={() => {
                  const next = value.filter((v) => v !== name);
                  onChange(next.length > 0 ? next : undefined);
                }}
                className="cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:bg-fill hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <FighterCombobox
        {...props}
        value={draft}
        placeholder="Ajouter un combattant"
        onChange={(next) => {
          // Un choix dans la liste (nom complet) s'ajoute ; la frappe reste dans le champ.
          const exact = props.fighters.some((f) => `${f.firstName} ${f.lastName}`.trim() === next);
          if (exact && !value.includes(next)) {
            onChange([...value, next]);
            setDraft("");
          } else setDraft(next);
        }}
      />
      {draft.trim().length >= 2 ? (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => {
            if (!value.includes(draft.trim())) onChange([...value, draft.trim()]);
            setDraft("");
          }}
        >
          Ajouter « {draft.trim()} »
        </button>
      ) : null}
    </div>
  );
}
