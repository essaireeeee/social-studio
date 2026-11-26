"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { formatDateTime } from "@/lib/format";
import {
  activeProfile,
  diffProfiles,
  listProfiles,
  pendingProfile,
  validateProfile,
} from "@/lib/editorial/profile-service";
import { canEditRules } from "@/lib/editorial/rule-service";
import { cn } from "@/lib/utils";
import type { Mode, UserProfile } from "@/types/domain";

const MODES: { id: Mode; label: string }[] = [
  { id: "live", label: "LIVE SHOW" },
  { id: "daily", label: "DAILY & MEDIA" },
];

interface CompareViewProps {
  repository: DexieRepository;
  user: UserProfile | null | undefined;
  initialMode: Mode;
}

/** Nouveau profil proposé face au profil actif, puis validation par un administrateur (section 8.8). */
export function CompareView({ repository, user, initialMode }: CompareViewProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const profiles = useLiveQuery(() => listProfiles(repository, mode), [repository, mode]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string }>();

  const active = profiles ? activeProfile(profiles) : undefined;
  const pending = profiles ? pendingProfile(profiles) : undefined;
  const isAdmin = canEditRules(user ?? undefined);
  const blocked = !isAdmin
    ? "Validation réservée au rôle administrateur."
    : pending?.includesDemo
      ? "Ce profil inclut les exemples fictifs : il ne peut pas être validé."
      : undefined;

  const validate = async () => {
    if (!pending) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await validateProfile(repository, user ?? undefined, pending.id);
      setMessage({ tone: "ok", text: "Profil validé : il alimente désormais les moteurs." });
    } catch (e) {
      setMessage({
        tone: "error",
        text: e instanceof Error ? e.message : "Validation impossible.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Mode à comparer" className="flex gap-2">
        {MODES.map((m) => (
          <Button
            key={m.id}
            size="sm"
            variant={mode === m.id ? "secondary" : "ghost"}
            aria-pressed={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setMessage(undefined);
            }}
          >
            <span className={cn("size-2 rounded-full", m.id === "live" ? "bg-live" : "bg-daily")} />
            {m.label}
          </Button>
        ))}
      </div>

      {message ? (
        <p
          role="status"
          className={cn("text-13", message.tone === "ok" ? "text-success" : "text-danger")}
        >
          {message.text}
        </p>
      ) : null}

      {!profiles ? null : !pending ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-13 text-muted-foreground">
          Aucun nouveau profil à valider. Recalculez l&apos;analyse depuis l&apos;onglet du mode
          pour en proposer un.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-xl bg-card squircle">
            <table className="w-full min-w-[520px] text-left text-13">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Indicateur</th>
                  <th className="px-4 py-2 font-medium">
                    Profil actif
                    {active
                      ? ` (${formatDateTime(active.validatedAt ?? active.createdAt)})`
                      : " (aucun)"}
                  </th>
                  <th className="px-4 py-2 font-medium">
                    Nouveau profil ({formatDateTime(pending.createdAt)})
                  </th>
                </tr>
              </thead>
              <tbody>
                {diffProfiles(active, pending).map((row) => (
                  <tr key={row.key} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{row.label}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.before}</td>
                    <td
                      className={cn(
                        "px-4 py-2 font-mono text-xs",
                        row.changed && "font-semibold text-foreground",
                      )}
                    >
                      {row.after}
                      {row.changed ? <span className="ml-2 text-warning">modifié</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!active ? (
            <p className="text-13 text-muted-foreground">
              Aucun profil validé pour ce mode : les moteurs utilisent les valeurs par défaut.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {blocked ? <span className="text-13 text-muted-foreground">{blocked}</span> : null}
            <Button
              onClick={validate}
              loading={busy}
              disabled={Boolean(blocked)}
              className="h-11 sm:h-8"
            >
              Valider ce profil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
