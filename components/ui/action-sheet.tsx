"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ActionSheetAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  actions: ActionSheetAction[];
  cancelLabel?: string;
  /** Contenu complémentaire (extrait du texte supprimé, par exemple). */
  children?: ReactNode;
}

const row =
  "flex min-h-14 w-full cursor-pointer items-center justify-center px-4 text-[17px] accent-transition hover:bg-fill active:bg-fill disabled:cursor-not-allowed disabled:opacity-40 md:min-h-11 md:text-[15px]";

/**
 * ActionSheet iOS (section 5.5) : menu qui monte du bas, action destructive en rouge,
 * « Annuler » séparé. Sert à toutes les confirmations de suppression. Rôle `alertdialog`,
 * focus piégé, `Échap` annule. Sur desktop : même contenu, centré.
 */
export function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
  cancelLabel = "Annuler",
  children,
}: ActionSheetProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
            "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:data-[state=open]:slide-in-from-bottom-0",
          )}
        >
          <div className="overflow-hidden rounded-2xl bg-surface shadow-float squircle">
            <div className="flex flex-col gap-1 px-4 py-3.5 text-center">
              <AlertDialogPrimitive.Title className="text-footnote font-semibold text-muted-foreground">
                {title}
              </AlertDialogPrimitive.Title>
              {description ? (
                <AlertDialogPrimitive.Description className="text-footnote text-muted-foreground">
                  {description}
                </AlertDialogPrimitive.Description>
              ) : null}
              {children ? <div className="mt-2 text-left">{children}</div> : null}
            </div>
            {actions.map((action) => (
              <AlertDialogPrimitive.Action
                key={action.label}
                disabled={action.disabled}
                onClick={action.onSelect}
                className={cn(
                  row,
                  "border-t-[0.5px] border-separator",
                  action.destructive ? "text-danger" : "text-accent-text",
                )}
              >
                {action.label}
              </AlertDialogPrimitive.Action>
            ))}
          </div>
          <AlertDialogPrimitive.Cancel
            className={cn(
              row,
              "rounded-2xl bg-surface font-semibold text-accent-text shadow-float squircle",
            )}
          >
            {cancelLabel}
          </AlertDialogPrimitive.Cancel>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
