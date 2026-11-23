import { Badge } from "@/components/ui/badge";
import { DEMO_BADGE, DEMO_BADGE_SHORT, STATUS_LABELS } from "@/lib/library/labels";
import { cn } from "@/lib/utils";
import type { Wording } from "@/types/domain";

/** Badges d'une publication : exemple fictif, Publié / Validé, hors références. */
export function WordingBadges({ wording, className }: { wording: Wording; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1", className)}>
      {wording.isDemo ? (
        <Badge variant="warning" title={DEMO_BADGE}>
          {DEMO_BADGE_SHORT}
        </Badge>
      ) : null}
      <Badge variant={wording.status === "published" ? "success" : "neutral"}>
        {STATUS_LABELS[wording.status]}
      </Badge>
      {!wording.isDemo && !wording.isReference ? (
        <Badge variant="neutral" title="Exclue de la recherche de références de style">
          Hors références
        </Badge>
      ) : null}
    </span>
  );
}
