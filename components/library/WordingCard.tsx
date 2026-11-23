import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { getCategory } from "@/lib/categories/registry";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import type { Wording } from "@/types/domain";
import { WordingBadges } from "./WordingBadges";
import { WordingMenu, type WordingAction } from "./WordingMenu";
import { dateLabel, excerptOf } from "./WordingRow";

export const CARD_HEIGHT = 176;
export const CARD_GAP = 12;

interface WordingCardProps {
  wording: Wording;
  position: number;
  total: number;
  style: CSSProperties;
  onAction: (action: WordingAction, wording: Wording) => void;
}

/** Vue grille : carte avec les trois premières lignes du texte. */
export function WordingCard({ wording, position, total, style, onAction }: WordingCardProps) {
  const category = getCategory(wording.categoryId);
  return (
    <article
      role="listitem"
      aria-setsize={total}
      aria-posinset={position}
      aria-label={category?.label ?? "Publication"}
      style={style}
      className="absolute flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3"
    >
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{category?.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {category?.label ?? "Sans catégorie"}
        </span>
        <Badge variant={wording.mode}>{wording.mode === "live" ? "LIVE" : "DAILY"}</Badge>
        <WordingMenu wording={wording} onAction={onAction} />
      </div>
      <button
        type="button"
        onClick={() => onAction("consult", wording)}
        className="flex min-h-0 flex-1 cursor-pointer items-start text-left text-13 leading-relaxed"
      >
        <span className="line-clamp-3">{excerptOf(wording.text)}</span>
      </button>
      <div className="flex items-center gap-2 overflow-hidden text-xs text-muted-foreground">
        <WordingBadges wording={wording} />
        <span className="truncate">
          {PLATFORM_RULES[wording.platform].label} · {dateLabel(wording)}
        </span>
      </div>
    </article>
  );
}
