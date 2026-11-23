"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
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
    <AlertDialog open={wording !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette publication ?</AlertDialogTitle>
          <AlertDialogDescription>
            Elle sera retirée de la bibliothèque, de l&apos;ADN éditorial et de la recherche de
            références. Cette action est définitive.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {wording ? (
          <p className="line-clamp-3 rounded-md border border-border bg-background p-2 text-13">
            {excerptOf(wording.text)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className={buttonVariants({ variant: "secondary" })}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={() => void confirm()}
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
