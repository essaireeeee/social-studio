"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Boîte de dialogue (shadcn/ui adaptée) : focus piégé, Échap ferme, focus rendu au déclencheur. */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-[12vh] left-1/2 z-50 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-subtle hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn("pr-8 text-base font-semibold", className)} {...props} />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-13 text-muted-foreground", className)}
      {...props}
    />
  );
}
