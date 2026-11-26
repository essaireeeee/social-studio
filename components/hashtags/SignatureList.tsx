"use client";

import { PenLine, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { deleteSignature, moveSignature } from "@/lib/hashtags/actions";
import { MODE_LABELS } from "@/lib/shell/mode";
import { toast } from "@/stores/toast.store";
import type { HexEvent, Signature } from "@/types/domain";
import { OrderButtons } from "./OrderButtons";
import { SignatureDialog } from "./SignatureDialog";
import { SignaturePreview } from "./SignaturePreview";

/** Signatures : ordre, activation, aperçu avec l'événement choisi (section 15.3). */
export function SignatureList({
  signatures,
  previewEvent,
}: {
  signatures: Signature[];
  previewEvent?: HexEvent;
}) {
  const repository = useRepository();
  const [editing, setEditing] = useState<Signature | "new" | null>(null);
  const [deleting, setDeleting] = useState<Signature | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Button className="self-start" onClick={() => setEditing("new")}>
        <Plus aria-hidden="true" />
        Nouvelle signature
      </Button>
      <ol className="flex flex-col gap-2" aria-label="Signatures">
        {signatures.map((signature, index) => (
          <li
            key={signature.id}
            aria-label={signature.name}
            className="flex flex-col gap-2 rounded-xl bg-card p-3 squircle"
          >
            <div className="flex flex-wrap items-center gap-3">
              <OrderButtons
                name={signature.name}
                index={index}
                count={signatures.length}
                onMove={(to) => repository && void moveSignature(repository, signatures, index, to)}
              />
              <p className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-13 font-medium">
                {signature.name}
                {signature.modes.map((m) => (
                  <Badge key={m} variant={m}>
                    {MODE_LABELS[m]}
                  </Badge>
                ))}
                {signature.requiresConfirmedSchedule ? <Badge>Horaires confirmés</Badge> : null}
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  role="switch"
                  checked={signature.enabled}
                  onChange={() =>
                    repository &&
                    void repository.signatures.put({ ...signature, enabled: !signature.enabled })
                  }
                  className="size-4 accent-[var(--accent)]"
                />
                Active
              </label>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Modifier ${signature.name}`}
                onClick={() => setEditing(signature)}
              >
                <PenLine aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Supprimer ${signature.name}`}
                onClick={() => setDeleting(signature)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <SignaturePreview values={signature} event={previewEvent} />
          </li>
        ))}
      </ol>
      {editing ? (
        <SignatureDialog
          signature={editing === "new" ? undefined : editing}
          previewEvent={previewEvent}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette signature ?"
        description="Elle ne sera plus proposée dans le Studio. Les textes déjà générés ne changent pas."
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (repository && deleting)
            void deleteSignature(repository, deleting.id).then(() =>
              toast("Signature supprimée", "success"),
            );
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
