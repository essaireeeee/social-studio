"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ConfirmStep {
  title: string;
  description: string;
  confirmLabel: string;
  /** Mot à recopier pour valider l'étape. */
  typed?: string;
}

/** Confirmations successives d'une action irréversible (double ou triple). */
export function StepConfirm({
  steps,
  open,
  onConfirm,
  onClose,
}: {
  steps: readonly ConfirmStep[];
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const step = steps[index]!;
  const close = () => {
    setIndex(0);
    setTyped("");
    onClose();
  };
  const next = () => {
    if (index < steps.length - 1) {
      setIndex(index + 1);
      setTyped("");
    } else {
      close();
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => !value && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step.title}
            {steps.length > 1 ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Confirmation {index + 1} sur {steps.length}
              </span>
            ) : null}
          </AlertDialogTitle>
          <AlertDialogDescription>{step.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {step.typed ? (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Recopiez « {step.typed} » pour confirmer
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className={buttonVariants({ variant: "secondary" })}>Annuler</AlertDialogCancel>
          <Button variant="destructive" disabled={Boolean(step.typed) && typed.trim() !== step.typed} onClick={next}>
            {step.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
