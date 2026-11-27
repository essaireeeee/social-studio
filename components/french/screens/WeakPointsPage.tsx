"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/useNow";
import { useRepository } from "@/hooks/useRepository";
import { FAMILY_LABELS } from "@/lib/french/labels";
import { cmRecords, MIN_ALERTS_FOR_STATS, trendLabel, weakPoints } from "@/lib/french/stats";
import { RuleSheet } from "../RuleSheet";

/** Mes points faibles (section 6.5) : règles les plus déclenchées sur les textes du CM. */
export function WeakPointsPage() {
  const repository = useRepository();
  const records = useLiveQuery(() => repository?.frenchIssues.list(), [repository]);
  const now = useNow(60_000);
  const [ruleId, setRuleId] = useState<string | null>(null);

  const points = records && now ? weakPoints(records, now) : undefined;
  const own = records ? cmRecords(records).length : 0;
  const max = Math.max(1, ...(points ?? []).map((p) => p.count));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Mes points faibles</LargeTitle>
        <p className="text-subheadline text-muted-foreground">
          Calculé sur vos propres textes. Les sorties des moteurs ne comptent pas.
        </p>
      </header>

      {points === undefined ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : points === null ? (
        <EmptyState
          icon={BarChart3}
          title="Pas encore assez de données"
          description={`Les statistiques apparaissent à partir de ${MIN_ALERTS_FOR_STATS} alertes sur vos textes. Vous en êtes à ${own}.`}
          action={
            <Button variant="secondary" asChild>
              <Link href="/french/training">S&apos;entraîner quand même</Link>
            </Button>
          }
        />
      ) : (
        <section aria-label="Règles les plus déclenchées" className="flex flex-col gap-1.5">
          <h2 className="px-4 text-footnote tracking-wide text-muted-foreground uppercase">
            Règles les plus déclenchées · {own} alertes
          </h2>
          <ol className="flex flex-col gap-3 rounded-xl bg-surface p-4 squircle">
            {points.map((point) => (
              <li key={point.ruleId}>
                <button
                  type="button"
                  onClick={() => setRuleId(point.ruleId)}
                  className="flex w-full cursor-pointer flex-col gap-1 text-left"
                  aria-label={`${point.title} : ${point.count} alerte${point.count > 1 ? "s" : ""}, ${trendLabel(point)} sur 30 jours`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-body">{point.title}</span>
                    <span className="shrink-0 text-subheadline text-muted-foreground tabular-nums">
                      {point.count}
                    </span>
                  </span>
                  <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-fill">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((point.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className="text-footnote text-muted-foreground">
                    {point.family ? `${FAMILY_LABELS[point.family]} · ` : ""}
                    30 derniers jours : {point.last30} ({trendLabel(point)}, contre{" "}
                    {point.previous30} avant)
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="px-4 text-footnote text-muted-foreground">
            Touchez une règle pour revoir son explication.{" "}
            <Link href="/french/training" className="text-accent-text underline">
              S&apos;entraîner sur ces règles
            </Link>
          </div>
        </section>
      )}
      <RuleSheet ruleId={ruleId} onClose={() => setRuleId(null)} />
    </div>
  );
}
