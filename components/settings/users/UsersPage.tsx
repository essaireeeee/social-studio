"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PenLine, Plus, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { LOCAL_ROLE_NOTICE, ROLE_LABELS, deleteUser, setActiveUser } from "@/lib/users/users";
import { toast } from "@/stores/toast.store";
import type { UserProfile } from "@/types/domain";
import { UserDialog } from "./UserDialog";
import { LargeTitle } from "@/components/layout/ScreenTitle";

/** Paramètres > Utilisateurs (section 16.3) : profils locaux et profil actif. */
export function UsersPage() {
  const repository = useRepository();
  const [editing, setEditing] = useState<UserProfile | "new" | null>(null);
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  const data = useLiveQuery(async () => {
    if (!repository) return undefined;
    const [users, settings] = await Promise.all([
      repository.users.list(),
      repository.getSettings(),
    ]);
    return {
      users: users.sort((a, b) => a.name.localeCompare(b.name, "fr")),
      activeId: settings.activeUserId,
    };
  }, [repository]);

  const guard = async (fn: () => Promise<void>, message: string) => {
    try {
      await fn();
      toast(message, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible.", "danger");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Utilisateurs</LargeTitle>
        <p className="text-13 text-muted-foreground">
          Le profil actif s&apos;affiche au pied de la barre latérale. Valider l&apos;ADN éditorial
          et modifier les règles demandent le rôle administrateur.
        </p>
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-13 text-warning">
          {LOCAL_ROLE_NOTICE}
        </p>
      </header>
      <Button className="self-start" onClick={() => setEditing("new")}>
        <Plus aria-hidden="true" />
        Nouveau profil
      </Button>
      {!data ? (
        <div className="h-24 animate-pulse rounded-xl bg-card squircle" aria-busy="true" />
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Profils">
          {data.users.map((user) => {
            const active = user.id === data.activeId;
            return (
              <li
                key={user.id}
                aria-label={user.name}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3 squircle"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-13 font-medium">
                  {user.name}
                  <Badge variant={user.role === "admin" ? "success" : "neutral"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  {active ? <Badge variant="live">Profil actif</Badge> : null}
                </span>
                {!active && repository ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void guard(
                        () => setActiveUser(repository, user.id),
                        `${user.name} est le profil actif`,
                      )
                    }
                  >
                    <UserCheck aria-hidden="true" />
                    Activer
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Modifier ${user.name}`}
                  onClick={() => setEditing(user)}
                >
                  <PenLine aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Supprimer ${user.name}`}
                  disabled={active}
                  onClick={() => setDeleting(user)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <UserDialog
          user={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer ce profil ?"
        description="Le profil disparaît de la liste. Les données de l'application ne sont pas touchées."
        confirmLabel="Supprimer"
        onConfirm={() =>
          repository &&
          deleting &&
          void guard(() => deleteUser(repository, deleting.id), "Profil supprimé")
        }
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
