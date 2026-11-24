"use client";

import { diffWords } from "diff";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ACTION_LABELS, ORIGIN_LABELS } from "@/lib/studio/revisions";
import type { Revision } from "@/types/domain";

interface DiffDialogProps {
  open: boolean;
  revisions: readonly Revision[];
  onOpenChange: (open: boolean) => void;
  /** Révision de départ (par défaut : l'avant-dernière). */
  defaultFrom?: number;
}

const revisionLabel = (r: Revision, i: number) =>
  `v${i + 1} · ${ORIGIN_LABELS[r.origin]}${r.action ? ` · ${ACTION_LABELS[r.action]}` : ""}`;

/** Différences mot à mot entre deux révisions (section 13.4). */
export function DiffDialog({ open, revisions, onOpenChange, defaultFrom }: DiffDialogProps) {
  const last = revisions.length - 1;
  const [from, setFrom] = useState(defaultFrom ?? Math.max(0, last - 1));
  const [to, setTo] = useState(last);
  const a = revisions[Math.min(from, last)]?.text ?? "";
  const b = revisions[Math.min(to, last)]?.text ?? "";
  const parts = diffWords(a, b);

  const picker = (label: string, value: number, onChange: (v: number) => void) => (
    <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground"
      >
        {revisions.map((r, i) => (
          <option key={r.id} value={i}>
            {revisionLabel(r, i)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Différences entre deux versions</DialogTitle>
        <DialogDescription>
          En vert ce qui a été ajouté, barré en rouge ce qui a été retiré.
        </DialogDescription>
        <div className="flex gap-3">
          {picker("De", from, setFrom)}
          {picker("À", to, setTo)}
        </div>
        <p className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap">
          {parts.map((part, i) =>
            part.added ? (
              <ins key={i} className="bg-success/15 text-success no-underline">
                {part.value}
              </ins>
            ) : part.removed ? (
              <del key={i} className="bg-danger/15 text-danger">
                {part.value}
              </del>
            ) : (
              <span key={i}>{part.value}</span>
            ),
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
