import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Bouton d'action flottant (section 5.5) : rond de 56 px, en bas à droite, au-dessus de la
 * tab bar. Mobile uniquement ; affiché sur Accueil, Bibliothèque et Calendrier.
 */
export function Fab({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-float accent-transition active:scale-95 md:hidden",
        className,
      )}
    >
      <Plus className="size-6" strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );
}
