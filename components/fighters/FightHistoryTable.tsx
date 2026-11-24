"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventLabelOf } from "@/lib/generation/native/context";
import {
  FIGHT_RESULTS,
  RESULT_LABELS,
  newFightRow,
  type FightResult,
  type FightRow,
} from "@/lib/fighters/form";
import type { HexEvent } from "@/types/domain";

const cell = "px-1.5 py-1.5";
const selectClass =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-13 text-foreground";

interface FightHistoryTableProps {
  rows: FightRow[];
  events: readonly HexEvent[];
  errors: Partial<Record<string, string>>;
  onChange: (rows: FightRow[]) => void;
}

/** Historique de combats éditable en tableau (section 15.1). */
export function FightHistoryTable({ rows, events, errors, onChange }: FightHistoryTableProps) {
  const patch = (key: string, value: Partial<FightRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...value } : r)));

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[40rem] text-left text-13">
            <caption className="sr-only">Historique de combats</caption>
            <thead className="bg-elevated text-xs text-muted-foreground">
              <tr>
                <th scope="col" className={cell}>
                  Date
                </th>
                <th scope="col" className={cell}>
                  Adversaire
                </th>
                <th scope="col" className={cell}>
                  Résultat
                </th>
                <th scope="col" className={cell}>
                  Méthode
                </th>
                <th scope="col" className={cell}>
                  Événement
                </th>
                <th scope="col" className={cell}>
                  <span className="sr-only">Retirer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const n = i + 1;
                return (
                  <tr key={row.key} className="border-t border-border align-top">
                    <td className={cell}>
                      <Input
                        type="date"
                        aria-label={`Date du combat ${n}`}
                        aria-invalid={Boolean(errors[`fight-${i}-date`]) || undefined}
                        value={row.date}
                        onChange={(e) => patch(row.key, { date: e.target.value })}
                      />
                    </td>
                    <td className={cell}>
                      <Input
                        aria-label={`Adversaire du combat ${n}`}
                        aria-invalid={Boolean(errors[`fight-${i}-opponent`]) || undefined}
                        value={row.opponent}
                        onChange={(e) => patch(row.key, { opponent: e.target.value })}
                      />
                    </td>
                    <td className={cell}>
                      <select
                        aria-label={`Résultat du combat ${n}`}
                        className={selectClass}
                        value={row.result}
                        onChange={(e) => patch(row.key, { result: e.target.value as FightResult })}
                      >
                        {FIGHT_RESULTS.map((r) => (
                          <option key={r} value={r}>
                            {RESULT_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cell}>
                      <Input
                        aria-label={`Méthode du combat ${n}`}
                        placeholder="KO, soumission…"
                        value={row.method}
                        onChange={(e) => patch(row.key, { method: e.target.value })}
                      />
                    </td>
                    <td className={cell}>
                      <select
                        aria-label={`Événement du combat ${n}`}
                        className={selectClass}
                        value={row.eventId}
                        onChange={(e) => patch(row.key, { eventId: e.target.value })}
                      >
                        <option value="">Hors HEXAGONE MMA</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {eventLabelOf(ev.name, ev.number)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cell}>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Retirer le combat ${n}`}
                        onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-13 text-muted-foreground">Aucun combat enregistré.</p>
      )}
      {Object.keys(errors).some((k) => k.startsWith("fight-")) ? (
        <p className="text-xs text-danger">Chaque combat demande une date et un adversaire.</p>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => onChange([...rows, newFightRow()])}
      >
        <Plus aria-hidden="true" />
        Ajouter un combat
      </Button>
    </div>
  );
}
