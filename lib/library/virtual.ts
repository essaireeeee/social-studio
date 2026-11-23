/**
 * Fenêtre de rendu de la liste virtuelle (section 14.1 : fluide à 5 000 posts). Seules les
 * lignes visibles, plus une marge, sont montées. Lignes de hauteur fixe. Logique pure.
 */

export interface VisibleRange {
  /** Première ligne rendue (incluse). */
  start: number;
  /** Dernière ligne rendue (exclue). */
  end: number;
}

/**
 * `viewTop` : position du haut de la zone visible, mesurée depuis le haut de la liste
 * (négative si la liste commence plus bas dans la page).
 */
export function visibleRange(
  viewTop: number,
  viewHeight: number,
  rowHeight: number,
  count: number,
  overscan = 6,
): VisibleRange {
  if (count === 0 || rowHeight <= 0) return { start: 0, end: 0 };
  const first = Math.floor(Math.max(0, viewTop) / rowHeight);
  const last = Math.ceil(Math.max(0, viewTop + viewHeight) / rowHeight);
  return {
    start: Math.min(count, Math.max(0, first - overscan)),
    end: Math.min(count, Math.max(0, last + overscan)),
  };
}

/** Nombre de cartes par ligne de la grille selon la largeur disponible. */
export function gridColumns(width: number, minCardWidth = 300, gap = 12, max = 4): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.min(max, Math.floor((width + gap) / (minCardWidth + gap))));
}
