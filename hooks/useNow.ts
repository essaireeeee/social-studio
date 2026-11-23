"use client";

import { useEffect, useState } from "react";

/**
 * Heure courante, rafraîchie à intervalle régulier (affichages « il y a 3 s »).
 * `null` au premier rendu : l'heure n'est jamais lue pendant le pré-rendu (Cache Components).
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
