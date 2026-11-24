"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useRepository } from "@/hooks/useRepository";
import { ROLE_LABELS, saveUser } from "@/lib/users/users";
import { toast } from "@/stores/toast.store";
import type { UserProfile } from "@/types/domain";

/** Création ou modification d'un profil local. */
export function UserDialog({ user, onClose }: { user?: UserProfile; onClose: () => void }) {
  const repository = useRepository();
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<UserProfile["role"]>(user?.role ?? "cm");
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (!repository) return;
    if (!name.trim()) return setError("Le nom est requis.");
    try {
      await saveUser(repository, { id: user?.id, name, role });
      toast(user ? "Profil modifié" : "Profil créé", "success");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{user ? "Modifier le profil" : "Nouveau profil"}</DialogTitle>
        <DialogDescription>
          L&apos;administrateur valide l&apos;ADN éditorial et modifie les règles.
        </DialogDescription>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField id="user-name" label="Nom" error={error}>
            <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Rôle</span>
            <Segmented<UserProfile["role"]>
              label="Rôle"
              value={role}
              onChange={setRole}
              options={[
                { value: "cm", label: ROLE_LABELS.cm },
                { value: "admin", label: ROLE_LABELS.admin },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
