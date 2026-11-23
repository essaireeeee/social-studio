import Link from "next/link";
import { NAV_ITEMS } from "@/lib/shell/navigation";

/**
 * Accueil provisoire : le Dashboard (section 16) arrive en Phase 11. La page n'affiche que
 * des accès réels vers les écrans déjà disponibles.
 */
export default function Home() {
  const available = NAV_ITEMS.filter((item) => item.available);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
          HEXAGONE MMA · SOCIAL STUDIO
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your voice. Your fight. Your content.
        </h1>
      </div>
      <nav aria-label="Écrans disponibles" className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-md border border-border bg-card px-3 py-2 text-13 accent-transition hover:bg-subtle"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
