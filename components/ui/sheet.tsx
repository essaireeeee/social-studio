"use client";

import type { ComponentProps } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

/**
 * Fiche de consultation (ancien panneau latéral V1). Même présentation que `Dialog` :
 * feuille à deux crans (moyen, grand) sur mobile, dialogue centré sur desktop.
 */
export function Sheet(props: ComponentProps<typeof Dialog>) {
  return <Dialog detents="medium" {...props} />;
}

export const SheetContent = DialogContent;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
