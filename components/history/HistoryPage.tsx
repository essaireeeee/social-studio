"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useHistoryData } from "@/hooks/useHistoryData";
import { useNow } from "@/hooks/useNow";
import { getCategory } from "@/lib/categories/registry";
import { formatDateTime } from "@/lib/format";
import {
  ENGINE_LABELS,
  GENERATION_STATUSES,
  GENERATION_STATUS_LABELS,
  filterHistory,
  finalTextOf,
  type HistoryFilters,
} from "@/lib/history/history";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import { MODE_LABELS } from "@/lib/shell/mode";
import type { GenerationStatus } from "@/lib/history/history";
import type { Mode } from "@/types/domain";
import { SquarePen } from "lucide-react";
import { SwipeActions } from "@/components/ui/swipe-actions";
import { useReopenInStudio } from "@/hooks/useReopenInStudio";
import { GenerationStatusBadge } from "./GenerationStatusBadge";
import { HistoryDetail } from "./HistoryDetail";
import { LargeTitle } from "@/components/layout/ScreenTitle";

const PAGE = 50;
const cell = "px-3 py-2";
const selectClass =
  "h-11 rounded-md border border-input bg-surface px-3 text-field text-foreground lg:h-9";

/** Historique des générations (section 16.1). */
export function HistoryPage() {
  const data = useHistoryData();
  const now = useNow(60_000);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => filterHistory(data?.generations ?? [], filters), [data, filters]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const opened = data?.generations.find((g) => g.id === openId);
  const reopenInStudio = useReopenInStudio();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Historique</LargeTitle>
        <p className="max-w-2xl text-subheadline text-muted-foreground">
          Toutes les générations, avec leurs versions. Brouillon, en cours de modification, validé,
          publié : chaque statut a sa propre étiquette.
        </p>
      </header>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Statut
          <select
            className={selectClass}
            value={filters.status ?? ""}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as GenerationStatus | undefined,
              }));
              setPage(0);
            }}
          >
            <option value="">Tous</option>
            {GENERATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {GENERATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Mode
          <select
            className={selectClass}
            value={filters.mode ?? ""}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                mode: (e.target.value || undefined) as Mode | undefined,
              }));
              setPage(0);
            }}
          >
            <option value="">Tous</option>
            <option value="live">{MODE_LABELS.live}</option>
            <option value="daily">{MODE_LABELS.daily}</option>
          </select>
        </label>
        <p className="pb-1.5 text-13 text-muted-foreground" aria-live="polite">
          {rows.length} génération{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      {!data ? (
        <div
          className="flex flex-col gap-2"
          aria-busy="true"
          aria-label="Chargement de l'historique"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-card squircle" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-13 text-muted-foreground">
          {data.generations.length === 0
            ? "Aucune génération pour l'instant. Elles apparaîtront ici dès le premier clic sur Générer."
            : "Aucune génération ne correspond aux filtres."}
        </p>
      ) : (
        <>
          {/* Mobile : cellules ; glisser vers la droite (ou appui long) pour rouvrir dans le Studio. */}
          <ul
            aria-label="Générations"
            className="overflow-hidden rounded-xl bg-card squircle md:hidden"
          >
            {rows.slice(current * PAGE, (current + 1) * PAGE).map((g) => (
              <li key={g.id} className="border-b-[0.5px] border-separator last:border-b-0">
                <SwipeActions
                  label={`Actions : ${getCategory(g.brief.categoryId)?.label ?? "génération"}`}
                  leading={[
                    { label: "Rouvrir", icon: SquarePen, onSelect: () => reopenInStudio(g) },
                  ]}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(g.id)}
                    className="flex w-full cursor-pointer flex-col gap-1 bg-card px-4 py-3 text-left active:bg-fill"
                  >
                    <span className="flex items-center justify-between gap-2 text-footnote text-muted-foreground">
                      <span className="truncate">
                        {formatDateTime(g.createdAt)} · {g.brief.mode === "live" ? "LIVE" : "DAILY"}{" "}
                        · {getCategory(g.brief.categoryId)?.label}
                      </span>
                      <GenerationStatusBadge status={g.status} />
                    </span>
                    <span className="line-clamp-2 text-subheadline">
                      {finalTextOf(g).replace(/\s+/g, " ")}
                    </span>
                  </button>
                </SwipeActions>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl bg-card squircle md:block">
            <table className="w-full min-w-[56rem] text-left text-13">
              <caption className="sr-only">Historique des générations</caption>
              <thead className="text-footnote text-muted-foreground">
                <tr>
                  <th scope="col" className={cell}>
                    Date
                  </th>
                  <th scope="col" className={cell}>
                    Mode
                  </th>
                  <th scope="col" className={cell}>
                    Catégorie
                  </th>
                  <th scope="col" className={cell}>
                    Plateforme
                  </th>
                  <th scope="col" className={cell}>
                    Moteur
                  </th>
                  <th scope="col" className={cell}>
                    Statut
                  </th>
                  <th scope="col" className={cell}>
                    Texte final
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(current * PAGE, (current + 1) * PAGE).map((g) => (
                  <tr key={g.id} className="border-t-[0.5px] border-separator hover:bg-fill/50">
                    <td className={`${cell} whitespace-nowrap`}>{formatDateTime(g.createdAt)}</td>
                    <td className={cell}>{g.brief.mode === "live" ? "LIVE" : "DAILY"}</td>
                    <td className={cell}>{getCategory(g.brief.categoryId)?.label}</td>
                    <td className={cell}>{PLATFORM_RULES[g.brief.platform].label}</td>
                    <td className={cell}>{ENGINE_LABELS[g.engine]}</td>
                    <td className={cell}>
                      <GenerationStatusBadge status={g.status} />
                    </td>
                    <td className={`${cell} max-w-80`}>
                      <button
                        type="button"
                        onClick={() => setOpenId(g.id)}
                        className="line-clamp-2 cursor-pointer text-left hover:underline"
                      >
                        {finalTextOf(g).replace(/\s+/g, " ")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {pages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          Page {current + 1} sur {pages}
          <Button
            size="sm"
            variant="secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Précédente
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Suivante
          </Button>
        </div>
      ) : null}

      <Sheet open={Boolean(opened)} onOpenChange={(open) => !open && setOpenId(null)}>
        {opened && data ? (
          <SheetContent className="max-w-3xl">
            <HistoryDetail
              generation={opened}
              wordings={data.wordings}
              groups={data.groups}
              signatures={data.signatures}
              today={now ? now.toISOString().slice(0, 10) : ""}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
