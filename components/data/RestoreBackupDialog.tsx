"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { RestoreOffer } from "@/lib/database/bootstrap";
import { formatDateTime, plural } from "@/lib/format";

interface RestoreBackupDialogProps {
  offer: RestoreOffer;
  busy: "restore" | "decline" | null;
  error?: string;
  onRestore: () => void;
  onDecline: () => void;
}

export function RestoreBackupDialog({
  offer,
  busy,
  error,
  onRestore,
  onDecline,
}: RestoreBackupDialogProps) {
  return (
    <AlertDialog open>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Sauvegarde locale trouvée</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-foreground">
            Une sauvegarde locale du {formatDateTime(offer.savedAt)} a été trouvée (
            {plural(offer.counts.wordings, "wording")}). Restaurer ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-13 text-muted-foreground">
          Ignorer : l&apos;application démarre avec les exemples fictifs. Une copie du fichier
          actuel est conservée dans <code className="font-mono text-xs">data/backups</code>.
        </p>
        {error ? (
          <p role="alert" className="text-13 text-danger">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <Button
            variant="secondary"
            className="h-11 sm:h-8"
            onClick={onDecline}
            loading={busy === "decline"}
            disabled={busy !== null}
          >
            Ignorer
          </Button>
          <Button
            className="h-11 sm:h-8"
            onClick={onRestore}
            loading={busy === "restore"}
            disabled={busy !== null}
          >
            Restaurer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
