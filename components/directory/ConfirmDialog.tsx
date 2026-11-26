"use client";

import type { ReactNode } from "react";
import { ActionSheet } from "@/components/ui/action-sheet";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation d'une action destructive, présentée en ActionSheet. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      actions={[{ label: confirmLabel, onSelect: onConfirm, destructive: true }]}
    />
  );
}
