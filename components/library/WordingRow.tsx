import type { CSSProperties } from "react";
import { getCategory } from "@/lib/categories/registry";
import { formatDate } from "@/lib/format";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import type { Wording } from "@/types/domain";
import { WordingBadges } from "./WordingBadges";
import { WordingMenu, type WordingAction } from "./WordingMenu";

export const ROW_HEIGHT = 56;

export const excerptOf = (text: string) => text.replace(/\s+/g, " ").trim();
export const dateLabel = (w: Wording) =>
  w.date ? formatDate(w.date) : `ajoutée le ${formatDate(w.createdAt)}`;

interface WordingRowProps {
  wording: Wording;
  position: number;
  total: number;
  style: CSSProperties;
  onAction: (action: WordingAction, wording: Wording) => void;
}

/** Vue liste : une ligne dense par publication. */
export function WordingRow({ wording, position, total, style, onAction }: WordingRowProps) {
  const category = getCategory(wording.categoryId);
  return (
    <div
      role="listitem"
      aria-setsize={total}
      aria-posinset={position}
      style={style}
      className="absolute inset-x-0 flex items-center gap-3 border-b border-border px-3"
    >
      <span aria-hidden="true" className="w-6 shrink-0 text-center text-base">
        {category?.emoji}
      </span>
      <button
        type="button"
        onClick={() => onAction("consult", wording)}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
      >
        <span className="w-full truncate text-13">{excerptOf(wording.text)}</span>
        <span className="w-full truncate text-xs text-muted-foreground">
          {category?.label ?? "Sans catégorie"} · {PLATFORM_RULES[wording.platform].label} ·{" "}
          {dateLabel(wording)}
        </span>
      </button>
      <WordingBadges wording={wording} className="hidden sm:flex" />
      <WordingMenu wording={wording} onAction={onAction} />
    </div>
  );
}
