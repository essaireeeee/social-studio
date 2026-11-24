"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRepository } from "@/hooks/useRepository";
import { saveGroup } from "@/lib/hashtags/actions";
import {
  KIND_LABELS,
  groupForm,
  groupFormErrors,
  parseHashtagList,
  type GroupKind,
} from "@/lib/hashtags/groups";
import { toast } from "@/stores/toast.store";
import type { HashtagGroup } from "@/types/domain";
import { ModeChecks } from "./ModeChecks";

/** Création ou modification d'un groupe de hashtags. */
export function GroupDialog({ group, onClose }: { group?: HashtagGroup; onClose: () => void }) {
  const repository = useRepository();
  const [values, setValues] = useState(() => groupForm(group));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const parsed = parseHashtagList(values.tagsText);

  const submit = async () => {
    if (!repository) return;
    const found = groupFormErrors(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await saveGroup(repository, values, group);
    toast(group ? "Groupe modifié" : "Groupe créé", "success");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{group ? "Modifier le groupe" : "Nouveau groupe de hashtags"}</DialogTitle>
        <DialogDescription>
          Un hashtag par ligne ou séparés par des virgules. Le « # » est ajouté et les espaces
          retirés automatiquement.
        </DialogDescription>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField id="group-name" label="Nom" error={errors.name}>
            <Input
              id="group-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </FormField>
          <FormField id="group-kind" label="Type">
            <select
              id="group-kind"
              value={values.kind}
              onChange={(e) => setValues((v) => ({ ...v, kind: e.target.value as GroupKind }))}
              className="h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground"
            >
              {(Object.keys(KIND_LABELS) as GroupKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="group-tags" label="Hashtags" error={errors.tags}>
            <Textarea
              id="group-tags"
              rows={4}
              value={values.tagsText}
              onChange={(e) => setValues((v) => ({ ...v, tagsText: e.target.value }))}
            />
          </FormField>
          {parsed.tags.length > 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="normalized-tags">
              Sera enregistré : {parsed.tags.join(" ")}
            </p>
          ) : null}
          <ModeChecks
            value={values.modes}
            error={errors.modes}
            onChange={(modes) => setValues((v) => ({ ...v, modes }))}
          />
          <label className="flex items-center gap-2 text-13">
            <input
              type="checkbox"
              checked={values.defaultOn}
              onChange={(e) => setValues((v) => ({ ...v, defaultOn: e.target.checked }))}
              className="size-4 accent-[var(--accent)]"
            />
            Coché par défaut dans le Studio
          </label>
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
