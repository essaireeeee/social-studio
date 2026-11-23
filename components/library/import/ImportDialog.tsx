"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ImportStepper } from "./ImportStepper";

interface ImportDialogProps {
  title: string;
  description: string;
  steps: readonly string[];
  current: number;
  onClose: () => void;
  children: ReactNode;
}

/** Cadre commun des imports. Un clic hors de la fenêtre ne la ferme pas (travail en cours). */
export function ImportDialog({
  title,
  description,
  steps,
  current,
  onClose,
  children,
}: ImportDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="top-[6vh] max-h-[88vh] max-w-5xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <ImportStepper steps={steps} current={current} />
        {children}
      </DialogContent>
    </Dialog>
  );
}
