"use client";

import { useEffect, useRef, useState } from "react";
import { visibleRange, type VisibleRange } from "@/lib/library/virtual";

interface WindowVirtualOptions {
  itemCount: number;
  /** Hauteur fixe d'une ligne, espacement compris. */
  rowHeight: number;
  /** Éléments par ligne selon la largeur de la liste (grille). Par défaut : 1. */
  columnsFor?: (width: number) => number;
  overscan?: number;
}

/**
 * Liste virtuelle qui défile avec la page : seules les lignes visibles, plus une marge,
 * sont montées. `start` et `end` sont des indices de ligne (fin exclue).
 */
export function useWindowVirtual({
  itemCount,
  rowHeight,
  columnsFor,
  overscan = 6,
}: WindowVirtualOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<VisibleRange>({ start: 0, end: 20 });
  const [width, setWidth] = useState(0);
  const columns = columnsFor ? columnsFor(width) : 1;
  const rowCount = Math.ceil(itemCount / columns);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const next = visibleRange(-rect.top, window.innerHeight, rowHeight, rowCount, overscan);
        setRange((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
        setWidth((prev) => (prev === rect.width ? prev : rect.width));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [rowCount, rowHeight, overscan]);

  return {
    ref,
    columns,
    rowCount,
    start: Math.min(range.start, rowCount),
    end: Math.min(range.end, rowCount),
    totalHeight: rowCount * rowHeight,
  };
}
