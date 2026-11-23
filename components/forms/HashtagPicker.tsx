"use client";

import type { HashtagGroup } from "@/types/domain";

interface HashtagPickerProps {
  groups: readonly HashtagGroup[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
}

/** Groupes de hashtags à cocher, avec l'aperçu de ce qui sera ajouté (section 13.3). */
export function HashtagPicker({ groups, selected, onChange }: HashtagPickerProps) {
  const tags = [...new Set(groups.filter((g) => selected.includes(g.id)).flatMap((g) => g.tags))];
  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun groupe de hashtags pour ce mode.</p>;
  }
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="sr-only">Hashtags</legend>
      {groups.map((group) => (
        <label key={group.id} className="flex items-start gap-2 text-13">
          <input
            type="checkbox"
            checked={selected.includes(group.id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, group.id]
                  : selected.filter((id) => id !== group.id),
              )
            }
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span className="flex min-w-0 flex-col">
            <span>{group.name}</span>
            <span className="truncate text-xs text-muted-foreground">{group.tags.join(" ")}</span>
          </span>
        </label>
      ))}
      <p className="text-xs text-muted-foreground">
        {tags.length > 0 ? `Ajoutés : ${tags.join(" ")}` : "Aucun hashtag ne sera ajouté."}
      </p>
    </fieldset>
  );
}
