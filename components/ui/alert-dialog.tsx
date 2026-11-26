"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Alerte qui exige une réponse (Radix). Sur mobile, présentée comme une ActionSheet iOS :
 * ancrée en bas, boutons pleine largeur, « Annuler » séparé en dessous. Sur desktop, alerte
 * centrée. Les confirmations de suppression passent par `ActionSheet` (`action-sheet.tsx`).
 */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;

export function AlertDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 grid max-h-[85dvh] gap-4 overflow-y-auto rounded-2xl bg-surface p-5 text-card-foreground shadow-float squircle data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
          "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=open]:zoom-in-[0.98]",
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5 text-center md:text-left", className)} {...props} />;
}

/** Boutons empilés pleine largeur sur mobile, « Annuler » en dernier ; alignés à droite sur desktop. */
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 md:flex-row md:justify-end [&>button]:h-11 [&>button]:w-full md:[&>button]:h-9 md:[&>button]:w-auto",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-headline text-foreground", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-subheadline text-muted-foreground", className)}
      {...props}
    />
  );
}
