"use client";

import { Merge, Split } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoriesByMode } from "@/lib/categories/registry";
import type { ImportRow, RowPatch } from "@/lib/import/rows";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";
import { cn } from "@/lib/utils";
import type { Mode, Platform, Wording } from "@/types/domain";
import { excerptOf } from "../WordingRow";

const PAGE_SIZE = 50;
const selectClass =
  "h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs text-foreground";

function DuplicateBadge({
  row,
  rows,
  wordings,
}: {
  row: ImportRow;
  rows: readonly ImportRow[];
  wordings: readonly Wording[];
}) {
  const d = row.duplicate;
  if (d.kind === "new") return <Badge variant="success">Nouveau</Badge>;
  const line = d.inBatch ? rows.findIndex((r) => r.key === d.of) + 1 : 0;
  const text = d.inBatch ? rows[line - 1]?.text : wordings.find((w) => w.id === d.of)?.text;
  const where = d.inBatch ? `ligne ${line}` : "bibliothèque";
  if (d.kind === "exact") return <Badge variant="danger">Doublon exact ({where})</Badge>;
  return (
    <Badge variant="warning" className="max-w-56 whitespace-normal" title={text}>
      Très proche de « {excerptOf(text ?? "").slice(0, 40)}… » ({where})
    </Badge>
  );
}

interface ImportReviewTableProps {
  rows: readonly ImportRow[];
  wordings: readonly Wording[];
  onPatch: (key: string, patch: RowPatch) => void;
  onMerge: (key: string, nextKey: string) => void;
  onSplit: (key: string) => void;
}

/** Étape « Vérifier » : une ligne par publication, 50 lignes par page. */
export function ImportReviewTable({
  rows,
  wordings,
  onPatch,
  onMerge,
  onSplit,
}: ImportReviewTableProps) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[56rem] text-left text-xs">
          <caption className="sr-only">Publications à vérifier avant l&apos;import</caption>
          <thead className="bg-elevated text-muted-foreground">
            <tr>
              <th scope="col" className="w-16 px-2 py-2">
                Importer
              </th>
              <th scope="col" className="px-2 py-2">
                Extrait
              </th>
              <th scope="col" className="w-32 px-2 py-2">
                Mode
              </th>
              <th scope="col" className="w-48 px-2 py-2">
                Catégorie
              </th>
              <th scope="col" className="w-28 px-2 py-2">
                Plateforme
              </th>
              <th scope="col" className="w-48 px-2 py-2">
                Doublon
              </th>
              <th scope="col" className="w-20 px-2 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const index = rows.indexOf(row);
              const n = index + 1;
              const next = rows[index + 1];
              const toReview = !row.categoryId;
              return (
                <tr
                  key={row.key}
                  className={cn("border-t border-border align-top", toReview && "bg-warning/5")}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Importer la ligne ${n}`}
                      checked={row.selected}
                      disabled={row.duplicate.kind === "exact" && row.duplicate.inBatch}
                      onChange={(e) => onPatch(row.key, { selected: e.target.checked })}
                      className="size-4 accent-[var(--accent)]"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <p className="line-clamp-2" title={row.text}>
                      <span className="mr-1 text-muted-foreground">{n}.</span>
                      {excerptOf(row.text)}
                    </p>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      aria-label={`Mode de la ligne ${n}`}
                      className={selectClass}
                      value={row.mode}
                      onChange={(e) => onPatch(row.key, { mode: e.target.value as Mode })}
                    >
                      <option value="live">LIVE SHOW</option>
                      <option value="daily">DAILY & MEDIA</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      aria-label={`Catégorie de la ligne ${n}`}
                      className={cn(selectClass, toReview && "border-warning text-warning")}
                      value={row.categoryId ?? ""}
                      onChange={(e) => onPatch(row.key, { categoryId: e.target.value })}
                    >
                      <option value="">À catégoriser</option>
                      {getCategoriesByMode(row.mode).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {row.categoryId && row.confidence < 1 ? (
                      <span className="mt-0.5 block text-muted-foreground">
                        Confiance {Math.round(row.confidence * 100)} %
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      aria-label={`Plateforme de la ligne ${n}`}
                      className={selectClass}
                      value={row.platform}
                      onChange={(e) => onPatch(row.key, { platform: e.target.value as Platform })}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {PLATFORM_RULES[p].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <DuplicateBadge row={row} rows={rows} wordings={wordings} />
                  </td>
                  <td className="px-2 py-2">
                    <span className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Scinder la ligne ${n}`}
                        title="Scinder à la première ligne vide"
                        disabled={!/\n\s*\n/.test(row.text)}
                        onClick={() => onSplit(row.key)}
                      >
                        <Split aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Fusionner la ligne ${n} avec la suivante`}
                        title="Fusionner avec la ligne suivante"
                        disabled={!next}
                        onClick={() => next && onMerge(row.key, next.key)}
                      >
                        <Merge aria-hidden="true" />
                      </Button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          Lignes {current * PAGE_SIZE + 1} à {Math.min(rows.length, (current + 1) * PAGE_SIZE)} sur{" "}
          {rows.length}
          <Button
            size="sm"
            variant="secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Précédentes
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Suivantes
          </Button>
        </div>
      ) : null}
    </div>
  );
}
