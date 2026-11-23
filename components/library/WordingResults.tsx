"use client";

import { useWindowVirtual } from "@/hooks/useWindowVirtual";
import { gridColumns } from "@/lib/library/virtual";
import type { LibraryView } from "@/stores/library.store";
import type { Wording } from "@/types/domain";
import { CARD_GAP, CARD_HEIGHT, WordingCard } from "./WordingCard";
import type { WordingAction } from "./WordingMenu";
import { ROW_HEIGHT, WordingRow } from "./WordingRow";

interface WordingResultsProps {
  wordings: readonly Wording[];
  view: LibraryView;
  onAction: (action: WordingAction, wording: Wording) => void;
}

const columnsFor = (width: number) => gridColumns(width, 300, CARD_GAP);

/** Résultats en liste ou en grille, virtualisés (seules les lignes visibles sont montées). */
export function WordingResults({ wordings, view, onAction }: WordingResultsProps) {
  const grid = view === "grid";
  const rowHeight = grid ? CARD_HEIGHT + CARD_GAP : ROW_HEIGHT;
  const { ref, columns, start, end, totalHeight } = useWindowVirtual({
    itemCount: wordings.length,
    rowHeight,
    columnsFor: grid ? columnsFor : undefined,
  });
  const items: { wording: Wording; index: number; row: number; column: number }[] = [];
  for (let row = start; row < end; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const wording = wordings[index];
      if (wording) items.push({ wording, index, row, column });
    }
  }
  const cardWidth = `calc((100% - ${(columns - 1) * CARD_GAP}px) / ${columns})`;

  return (
    <div
      ref={ref}
      role="list"
      aria-label="Publications de la bibliothèque"
      className={grid ? "relative" : "relative rounded-lg border border-border bg-card"}
      style={{ height: Math.max(totalHeight - (grid ? CARD_GAP : 0), 0) }}
    >
      {items.map(({ wording, index, row, column }) =>
        grid ? (
          <WordingCard
            key={wording.id}
            wording={wording}
            position={index + 1}
            total={wordings.length}
            onAction={onAction}
            style={{
              top: row * rowHeight,
              left: `calc(${column} * (${cardWidth} + ${CARD_GAP}px))`,
              width: cardWidth,
              height: CARD_HEIGHT,
            }}
          />
        ) : (
          <WordingRow
            key={wording.id}
            wording={wording}
            position={index + 1}
            total={wordings.length}
            onAction={onAction}
            style={{ top: row * rowHeight, height: ROW_HEIGHT }}
          />
        ),
      )}
    </div>
  );
}
