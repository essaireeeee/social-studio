import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doit connaître les tailles de texte ajoutées dans `globals.css`
 * (`text-13` et l'échelle iOS `text-body`, `text-headline`…), sinon il les confond avec
 * une couleur et supprime l'une des deux classes.
 */
export const TYPE_SCALE = [
  "large-title",
  "title-1",
  "title-2",
  "title-3",
  "headline",
  "body",
  "callout",
  "subheadline",
  "footnote",
  "caption",
  "field",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["13", ...TYPE_SCALE],
    },
  },
});

/** Fusionne des classes Tailwind en résolvant les conflits (convention shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
