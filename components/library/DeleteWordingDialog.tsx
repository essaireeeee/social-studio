"use client";

import { ActionSheet } from "@/components/ui/action-sheet";
import { useRepository } from "@/hooks/useRepository";
import { deleteWording } from "@/lib/library/actions";
import { toast } from "@/stores/toast.store";
import type { Wording } from "@/types/domain";
import { excerptOf } from "./WordingRow";

/** Suppression définitive d'une publication, après confirmation. */
export function DeleteWordingDialog({
  wording,
  onClose,
}: {
  wording: Wording | null;
  onClose: () => void;
}) {
  const repository = useRepository();
  const confirm = async () => {
    if (!repository || !wording) return;
    try {
      await deleteWording(repository, wording.id);
      toast("Publication supprimée", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Suppression impossible.", "danger");
    }
  };

  return (
    <ActionSheet
      open={wording !== null}
      onClose={onClose}
      title="Supprimer cette publication ?"
      description="Elle sera retirée de la bibliothèque, de l'ADN éditorial et de la recherche de références. Cette action est définitive."
      actions={[{ label: "Supprimer", destructive: true, onSelect: () => void confirm() }]}
    >
      {wording ? (
        <p className="line-clamp-3 rounded-md bg-surface-2 p-2 text-13">
          {excerptOf(wording.text)}
        </p>
      ) : null}
    </ActionSheet>
  );
}
