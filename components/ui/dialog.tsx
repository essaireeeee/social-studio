"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { createContext, useContext, type ComponentProps } from "react";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/useMedia";
import { cn } from "@/lib/utils";

/**
 * Sheet iOS (section 5.5). Sur mobile : feuille qui monte du bas (vaul), poignée, glisser
 * vers le bas pour fermer, fond assombri. Sur tablette et desktop : dialogue centré de 560 px.
 * Dans les deux cas : focus piégé, `Échap` ferme, focus rendu au déclencheur (Radix).
 * Titre, description et bouton de fermeture sont les mêmes primitives Radix : vaul s'appuie
 * sur le même `Dialog` Radix (dépendance dédoublonnée).
 */
type Presentation = "sheet" | "dialog";
const PresentationContext = createContext<Presentation>("dialog");

export interface DialogProps extends ComponentProps<typeof DialogPrimitive.Root> {
  /** Crans sur mobile : `large` (défaut) ou `medium`, extensible en grand en tirant la poignée. */
  detents?: "large" | "medium";
}

const MEDIUM_SNAP_POINTS: (number | string)[] = [0.6, 1];

export function Dialog({ children, detents = "large", ...props }: DialogProps) {
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <PresentationContext.Provider value="sheet">
        {detents === "medium" ? (
          <Drawer.Root {...props} snapPoints={MEDIUM_SNAP_POINTS} fadeFromIndex={0}>
            {children}
          </Drawer.Root>
        ) : (
          <Drawer.Root {...props}>{children}</Drawer.Root>
        )}
      </PresentationContext.Provider>
    );
  }
  return (
    <PresentationContext.Provider value="dialog">
      <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>
    </PresentationContext.Provider>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** Vrai dans une feuille mobile : pour adapter une mise en page (boutons pleine largeur…). */
export function useInSheet(): boolean {
  return useContext(PresentationContext) === "sheet";
}

const closeButton =
  "absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-full bg-fill text-muted-foreground hover:text-foreground pointer-coarse:size-11";

export function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  const presentation = useContext(PresentationContext);

  if (presentation === "sheet") {
    return (
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)]" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col gap-4 overflow-y-auto rounded-t-2xl bar-material px-4 pt-7 pb-[calc(1rem+env(safe-area-inset-bottom))] text-card-foreground outline-none",
            className,
            // Les largeurs maximales visent le dialogue desktop : la feuille prend toute la largeur.
            "top-auto right-0 left-0 max-h-[94dvh] w-full max-w-none translate-x-0 rounded-b-none",
          )}
          {...props}
        >
          <div
            aria-hidden="true"
            className="absolute top-2 left-1/2 h-1.5 w-9 -translate-x-1/2 rounded-full bg-label-3"
          />
          {children}
          {hideClose ? null : (
            <DialogPrimitive.Close className={closeButton} aria-label="Fermer">
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    );
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-[10vh] left-1/2 z-50 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-2xl bg-surface p-6 text-card-foreground shadow-float squircle data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close className={closeButton} aria-label="Fermer">
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pr-10 text-headline", className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-subheadline text-muted-foreground", className)}
      {...props}
    />
  );
}
