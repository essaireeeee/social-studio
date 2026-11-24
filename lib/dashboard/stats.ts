/** Blocs compacts du dashboard (section 16.2). Les exemples fictifs sont comptés à part. */
import type { Generation, Wording } from "@/types/domain";

export interface DashboardStats {
  lastGenerations: Generation[];
  lastWordings: Wording[];
  references: { real: number; demo: number };
  /** Publications réelles par mode. */
  split: { live: number; daily: number };
}

export function dashboardStats(
  generations: readonly Generation[],
  wordings: readonly Wording[],
  limit = 5,
): DashboardStats {
  const real = wordings.filter((w) => !w.isDemo);
  return {
    lastGenerations: [...generations]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
    lastWordings: [...wordings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
    references: {
      real: real.filter((w) => w.isReference).length,
      demo: wordings.filter((w) => w.isDemo).length,
    },
    split: {
      live: real.filter((w) => w.mode === "live").length,
      daily: real.filter((w) => w.mode === "daily").length,
    },
  };
}

/** Part de LIVE SHOW en pourcentage entier (0 si aucune publication). */
export const livePercent = ({ live, daily }: DashboardStats["split"]) =>
  live + daily === 0 ? 0 : Math.round((live / (live + daily)) * 100);
