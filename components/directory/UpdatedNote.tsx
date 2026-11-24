"use client";

import { Badge } from "@/components/ui/badge";
import { useNow } from "@/hooks/useNow";
import { formatDate, isStale } from "@/lib/format";

/** « Mise à jour le … », et « À vérifier » au-delà de 90 jours (section 15.1). */
export function UpdatedNote({ at, compact = false }: { at: string; compact?: boolean }) {
  const now = useNow(60_000);
  const stale = now ? isStale(at, now) : false;
  if (compact) return stale ? <Badge variant="warning">À vérifier</Badge> : null;
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      Mise à jour le {formatDate(at)}
      {stale ? <Badge variant="warning">À vérifier</Badge> : null}
    </p>
  );
}
