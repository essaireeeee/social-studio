"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { GenerationStatusBadge } from "@/components/history/GenerationStatusBadge";
import { useAiOverview } from "@/hooks/useAiOverview";
import { useHistoryData } from "@/hooks/useHistoryData";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useNow } from "@/hooks/useNow";
import { getCategory } from "@/lib/categories/registry";
import { dashboardStats, livePercent } from "@/lib/dashboard/stats";
import { formatDate } from "@/lib/format";
import { eventLabelOf } from "@/lib/generation/native/context";
import { finalTextOf } from "@/lib/history/history";
import { syncLabel } from "@/lib/shell/sync-label";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/data.store";
import { DashboardBlock } from "./DashboardBlock";
import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Fab } from "@/components/ui/fab";

const excerpt = (text: string) => text.replace(/\s+/g, " ").trim();

/** Dashboard (section 16.2) : accès rapides et état de l'outil, sans graphique décoratif. */
export function DashboardPage() {
  const data = useHistoryData();
  const session = useLiveSession();
  const { indicator } = useAiOverview();
  const sync = useDataStore((s) => s.fileSync);
  const now = useNow();
  const stats = data ? dashboardStats(data.generations, data.wordings) : null;
  const percent = stats ? livePercent(stats.split) : 0;
  const backup = syncLabel(sync, now);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-3 pb-24 sm:px-6 md:pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-footnote font-semibold tracking-wide text-muted-foreground uppercase">
            HEXAGONE MMA · Social Studio
          </p>
          <LargeTitle>Accueil</LargeTitle>
          <p className="text-subheadline text-muted-foreground">
            Bienvenue dans votre Social Studio.
          </p>
        </div>
        {/* Sur mobile, le bouton d'action flottant le remplace. */}
        <Link
          href="/studio"
          className="hidden h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold tracking-wide text-accent-foreground accent-transition squircle hover:brightness-110 md:inline-flex"
        >
          <PenLine className="size-4" aria-hidden="true" />
          NOUVEAU WORDING
        </Link>
      </header>

      <nav aria-label="Ouvrir le Studio" className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/studio?mode=live"
          className="flex flex-col gap-1 rounded-xl bg-card p-5 squircle hover:bg-fill/60"
        >
          <span className="flex items-center gap-2 text-title-3 tracking-wide text-live-text">
            <span className="size-2.5 animate-on-air rounded-full bg-live" aria-hidden="true" />
            LIVE SHOW
          </span>
          <span className="text-13 text-muted-foreground">
            Pendant la soirée : résultats, ambiance, réactions.
          </span>
        </Link>
        <Link
          href="/studio?mode=daily"
          className="flex flex-col gap-1 rounded-xl bg-card p-5 squircle hover:bg-fill/60"
        >
          <span className="flex items-center gap-2 text-title-3 tracking-wide text-daily-text">
            <span className="size-2.5 rounded-full bg-daily" aria-hidden="true" />
            DAILY & MEDIA
          </span>
          <span className="text-13 text-muted-foreground">
            Le reste du temps : annonces, billetterie, médias.
          </span>
        </Link>
      </nav>
      <Fab href="/studio" label="Nouveau wording" />

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardBlock title="Dernières générations" href="/history" linkLabel="Historique">
          {!stats ? (
            <div className="h-24 animate-skeleton rounded-lg bg-fill" />
          ) : stats.lastGenerations.length === 0 ? (
            <p className="text-13 text-muted-foreground">Aucune génération pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.lastGenerations.map((g) => (
                <li key={g.id} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GenerationStatusBadge status={g.status} />
                    {getCategory(g.brief.categoryId)?.label}
                  </span>
                  <span className="truncate text-13">{excerpt(finalTextOf(g))}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardBlock>

        <DashboardBlock
          title="Derniers wordings enregistrés"
          href="/library"
          linkLabel="Bibliothèque"
        >
          {!stats ? (
            <div className="h-24 animate-skeleton rounded-lg bg-fill" />
          ) : stats.lastWordings.length === 0 ? (
            <p className="text-13 text-muted-foreground">La bibliothèque est vide.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.lastWordings.map((w) => (
                <li key={w.id} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {getCategory(w.categoryId)?.label} · {formatDate(w.createdAt)}
                    {w.isDemo ? " · exemple fictif" : ""}
                  </span>
                  <span className="truncate text-13">{excerpt(w.text)}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardBlock>

        <div className="flex min-w-0 flex-col gap-4">
          <DashboardBlock title="Références de style" href="/editorial" linkLabel="ADN éditorial">
            {stats ? (
              <>
                <p className="text-13" data-testid="reference-counts">
                  <strong className="text-lg">{stats.references.real}</strong> réelles ·{" "}
                  <span className="text-muted-foreground">
                    {stats.references.demo} fictives (exclues)
                  </span>
                </p>
                <div className="flex flex-col gap-1">
                  <div
                    className="flex h-2 overflow-hidden rounded-full bg-elevated"
                    role="img"
                    aria-label={`Publications réelles : ${stats.split.live} LIVE SHOW, ${stats.split.daily} DAILY & MEDIA`}
                  >
                    <span className="bg-live" style={{ width: `${percent}%` }} />
                    <span
                      className={cn(
                        "bg-daily",
                        stats.split.live + stats.split.daily === 0 && "hidden",
                      )}
                      style={{ width: `${100 - percent}%` }}
                    />
                  </div>
                  <p className="flex justify-between text-xs text-muted-foreground">
                    <span>LIVE {stats.split.live}</span>
                    <span>DAILY {stats.split.daily}</span>
                  </p>
                </div>
              </>
            ) : null}
          </DashboardBlock>
          <DashboardBlock title="État">
            <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-13">
              <dt className="text-muted-foreground">Session Live</dt>
              <dd>{session ? eventLabelOf(session.eventName, session.eventNumber) : "Aucune"}</dd>
              <dt className="text-muted-foreground">Moteur IA</dt>
              <dd>
                <Link href="/settings/ai" className="hover:underline">
                  {indicator.text}
                </Link>
              </dd>
              <dt className="text-muted-foreground">Sauvegarde</dt>
              <dd className={backup.tone === "danger" ? "text-danger" : undefined}>
                {backup.text}
              </dd>
            </dl>
          </DashboardBlock>
        </div>
      </div>
    </div>
  );
}
