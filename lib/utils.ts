import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doit connaître les tailles de texte ajoutées dans `globals.css`
 * (`text-13`), sinon il les confond avec une couleur et supprime l'une des deux classes.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["13"],
    },
  },
});

/** Fusionne des classes Tailwind en résolvant les conflits (convention shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
