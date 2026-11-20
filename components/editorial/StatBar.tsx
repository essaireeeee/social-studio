import type { Mode } from "@/types/domain";
import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  /** Valeur affichée à droite (déjà formatée). */
  value: string;
  /** Part de la barre, entre 0 et 1. */
  fraction: number;
  mode: Mode;
  mono?: boolean;
}

/** Barre horizontale simple : libellé, barre proportionnelle, valeur. Pas de décor. */
export function StatBar({ label, value, fraction, mode, mono = false }: StatBarProps) {
  const width = `${Math.max(2, Math.min(100, Math.round(fraction * 100)))}%`;
  return (
    <li className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-13 sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
      <span className={cn("truncate text-foreground", mono && "font-mono text-xs")} title={label}>
        {label}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-elevated" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full", mode === "live" ? "bg-live" : "bg-daily")}
          style={{ width }}
        />
      </span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{value}</span>
    </li>
  );
}

export function StatBarList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
}
