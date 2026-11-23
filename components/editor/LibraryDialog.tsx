"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRepository } from "@/hooks/useRepository";
import { getCategory } from "@/lib/categories/registry";
import { saveToLibrary } from "@/lib/studio/actions";
import { MODE_LABELS } from "@/lib/shell/mode";
import { toast } from "@/stores/toast.store";
import type { Generation } from "@/types/domain";

interface LibraryDialogProps {
  generation: Generation;
  text: string;
  onClose: () => void;
}

/** Fiche bibliothèque pré-remplie (statut `validated`) : texte, date et lien facultatifs. */
export function LibraryDialog({ generation, text, onClose }: LibraryDialogProps) {
  const repository = useRepository();
  const [value, setValue] = useState(text);
  const [date, setDate] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const category = getCategory(generation.brief.categoryId);

  const submit = async () => {
    if (!repository) return;
    if (!value.trim()) return setError("Le texte est vide.");
    if (url && !/^https?:\/\//.test(url))
      return setError("Le lien doit commencer par http:// ou https://.");
    setBusy(true);
    try {
      await saveToLibrary(repository, generation, { text: value.trim(), date, instagramUrl: url });
      toast("Enregistré dans la bibliothèque", "success");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Enregistrer dans la bibliothèque</DialogTitle>
        <DialogDescription>
          {MODE_LABELS[generation.brief.mode]} · {category?.label} · statut « validé ». Une
          publication validée sert ensuite de référence de style.
        </DialogDescription>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Texte
          <Textarea
            autoResize
            rows={5}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Date de publication (facultatif)
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Lien Instagram (facultatif)
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value.trim())}
              placeholder="https://"
            />
          </label>
        </div>
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
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
