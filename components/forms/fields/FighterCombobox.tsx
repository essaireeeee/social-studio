"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { useRepository } from "@/hooks/useRepository";
import { newId } from "@/lib/database/hash";
import { fighterName, searchFighters } from "@/lib/studio/fighter-search";
import { cn } from "@/lib/utils";
import type { Fighter } from "@/types/domain";

interface FighterComboboxProps {
  id: string;
  label: string;
  value: string;
  fighters: readonly Fighter[];
  /** Combattants de la fight card de l'événement actif : proposés en premier. */
  priorityIds?: readonly string[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
}

type Option =
  | { kind: "fighter"; fighter: Fighter }
  | { kind: "free"; text: string }
  | { kind: "create"; text: string };

/**
 * Combattant (section 13.3) : recherche floue dès 2 caractères, flèches et Entrée.
 * Inconnu : « Utiliser “Xxx” » (texte libre) ou « Créer la fiche ».
 */
export function FighterCombobox({
  id,
  label,
  value,
  fighters,
  priorityIds,
  placeholder,
  invalid,
  describedBy,
  onChange,
}: FighterComboboxProps) {
  const listId = useId();
  const repository = useRepository();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = value.trim();

  const options = useMemo<Option[]>(() => {
    const found = searchFighters(query, fighters, { priorityIds });
    const exact = found.some((f) => fighterName(f).toLowerCase() === query.toLowerCase());
    if (query.length < 2 || exact) return found.map((fighter) => ({ kind: "fighter", fighter }));
    return [
      ...found.map((fighter): Option => ({ kind: "fighter", fighter })),
      { kind: "free", text: query },
      ...(query.includes(" ") ? [{ kind: "create", text: query } as Option] : []),
    ];
  }, [query, fighters, priorityIds]);

  const visible = open && options.length > 0;
  const selected = Math.min(active, options.length - 1);

  const choose = async (option: Option) => {
    setOpen(false);
    if (option.kind === "fighter") return onChange(fighterName(option.fighter));
    if (option.kind === "free") return onChange(option.text);
    if (!repository) return;
    const parts = option.text.split(/\s+/);
    const fighter: Fighter = {
      id: newId(),
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts.at(-1)!,
      fightHistory: [],
      updatedAt: new Date().toISOString(),
    };
    await repository.fighters.put(fighter);
    onChange(fighterName(fighter));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && visible) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!visible) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive((selected + delta + options.length) % options.length);
    } else if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void choose(options[selected]!);
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible ? `${listId}-${selected}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={label}
        autoComplete="off"
        placeholder={placeholder ?? "Nom, prénom ou surnom"}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {visible ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Suggestions : ${label}`}
          className="absolute inset-x-0 top-9 z-30 max-h-60 overflow-y-auto rounded-md border border-border bg-elevated p-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.kind === "fighter" ? option.fighter.id : `${option.kind}-${option.text}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              onMouseDown={(event) => {
                event.preventDefault();
                void choose(option);
              }}
              onMouseMove={() => setActive(index)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-13",
                index === selected ? "bg-subtle" : "",
              )}
            >
              {option.kind === "fighter" ? (
                <>
                  <span>{fighterName(option.fighter)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[option.fighter.nickname, option.fighter.weightClass]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </>
              ) : option.kind === "free" ? (
                <span>Utiliser « {option.text} »</span>
              ) : (
                <span>Créer la fiche « {option.text} »</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
