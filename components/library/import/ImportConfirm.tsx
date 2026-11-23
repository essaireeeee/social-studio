"use client";

import { useState } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { plural } from "@/lib/format";
import type { ImportSummary } from "@/lib/import/rows";

interface ImportConfirmProps {
  summary: ImportSummary;
  /** Doublons exacts de la bibliothèque présents dans le lot. */
  libraryDuplicates: number;
  replace: boolean;
  onReplace: (replace: boolean) => void;
  busy: boolean;
  onBack: () => void;
  onImport: () => void;
}

/** Étape « Confirmer » : résumé et bouton unique. « Remplacer » demande une confirmation. */
export function ImportConfirm(props: ImportConfirmProps) {
  const { summary, libraryDuplicates, replace } = props;
  const [asking, setAsking] = useState(false);
  const created = summary.toImport - summary.replaced;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1 text-13" aria-label="Résumé de l'import">
        <li>
          <strong>{plural(created, "nouvelle publication", "nouvelles publications")}</strong>
        </li>
        {summary.replaced > 0 ? (
          <li>{plural(summary.replaced, "doublon exact remplacé", "doublons exacts remplacés")}</li>
        ) : null}
        <li className="text-muted-foreground">
          {plural(summary.duplicatesIgnored, "doublon ignoré", "doublons ignorés")}
        </li>
        {summary.missingCategory > 0 ? (
          <li className="text-warning">
            {plural(summary.missingCategory, "ligne cochée", "lignes cochées")} sans catégorie : non
            importée{summary.missingCategory > 1 ? "s" : ""}. Revenez à l&apos;étape Vérifier pour
            les catégoriser.
          </li>
        ) : null}
      </ul>

      {libraryDuplicates > 0 ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-elevated p-3 text-13">
          <p className="text-muted-foreground">
            {plural(libraryDuplicates, "publication est déjà", "publications sont déjà")} dans la
            bibliothèque à l&apos;identique. Par défaut, elles sont ignorées.
          </p>
          {replace ? (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => props.onReplace(false)}
            >
              Ne plus remplacer les doublons exacts
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => setAsking(true)}
            >
              Remplacer…
            </Button>
          )}
        </div>
      ) : null}

      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={props.onBack}>
          Retour à la vérification
        </Button>
        <Button loading={props.busy} disabled={summary.toImport === 0} onClick={props.onImport}>
          Importer {plural(summary.toImport, "publication")}
        </Button>
      </div>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer les doublons exacts ?</AlertDialogTitle>
            <AlertDialogDescription>
              {plural(
                libraryDuplicates,
                "publication existante sera écrasée",
                "publications existantes seront écrasées",
              )}{" "}
              par la version importée (catégorie, plateforme, date et métadonnées du fichier).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={buttonVariants({ variant: "secondary" })}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => props.onReplace(true)}
            >
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
