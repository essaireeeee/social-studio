"use client";

import { PenLine, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { deleteGroup, moveGroup } from "@/lib/hashtags/actions";
import { KIND_LABELS } from "@/lib/hashtags/groups";
import { MODE_LABELS } from "@/lib/shell/mode";
import { toast } from "@/stores/toast.store";
import type { HashtagGroup } from "@/types/domain";
import { GroupDialog } from "./GroupDialog";
import { OrderButtons } from "./OrderButtons";

/** Groupes de hashtags : ordre, état par défaut, modification, suppression (section 15.3). */
export function GroupList({ groups }: { groups: HashtagGroup[] }) {
  const repository = useRepository();
  const [editing, setEditing] = useState<HashtagGroup | "new" | null>(null);
  const [deleting, setDeleting] = useState<HashtagGroup | null>(null);

  const toggleDefault = async (group: HashtagGroup) => {
    if (!repository) return;
    await repository.hashtagGroups.put({ ...group, defaultOn: !group.defaultOn });
  };

  return (
    <div className="flex flex-col gap-3">
      <Button className="self-start" onClick={() => setEditing("new")}>
        <Plus aria-hidden="true" />
        Nouveau groupe
      </Button>
      <ol className="flex flex-col gap-2" aria-label="Groupes de hashtags">
        {groups.map((group, index) => (
          <li
            key={group.id}
            aria-label={group.name}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <OrderButtons
              name={group.name}
              index={index}
              count={groups.length}
              onMove={(to) => repository && void moveGroup(repository, groups, index, to)}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2 text-13 font-medium">
                {group.name}
                <Badge>{KIND_LABELS[group.kind]}</Badge>
                {group.modes.map((m) => (
                  <Badge key={m} variant={m}>
                    {MODE_LABELS[m]}
                  </Badge>
                ))}
              </p>
              <p className="truncate text-xs text-muted-foreground">{group.tags.join(" ")}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                role="switch"
                checked={group.defaultOn}
                onChange={() => void toggleDefault(group)}
                className="size-4 accent-[var(--accent)]"
              />
              Par défaut
            </label>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Modifier ${group.name}`}
              onClick={() => setEditing(group)}
            >
              <PenLine aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Supprimer ${group.name}`}
              onClick={() => setDeleting(group)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      {editing ? (
        <GroupDialog
          group={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer ce groupe ?"
        description="Il ne sera plus proposé dans le Studio. Les textes déjà générés ne changent pas."
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (repository && deleting)
            void deleteGroup(repository, deleting.id).then(() =>
              toast("Groupe supprimé", "success"),
            );
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
