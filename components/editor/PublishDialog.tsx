"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PublishDialogProps {
  /** Date du jour (AAAA-MM-JJ), proposée par défaut. */
  today: string;
  onConfirm: (input: { publishedAt: string; url?: string }) => Promise<void>;
  onClose: () => void;
}

/** « Marquer comme publié » : déclaration manuelle du CM, avec la date et le lien éventuel. */
export function PublishDialog({ today, onConfirm, onClose }: PublishDialogProps) {
  const [date, setDate] = useState(today);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Date de publication requise.");
    if (url && !/^https?:\/\//.test(url))
      return setError("Le lien doit commencer par http:// ou https://.");
    setBusy(true);
    try {
      await onConfirm({ publishedAt: date, url: url || undefined });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Marquer comme publié ?</DialogTitle>
        <DialogDescription>
          Vous déclarez que ce texte a été publié. Le statut passe à « Publiée » ; le texte devient
          le texte final de cette génération.
        </DialogDescription>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Date de publication
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Lien de la publication (facultatif)
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value.trim())}
            placeholder="https://"
          />
        </label>
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            Marquer comme publié
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
