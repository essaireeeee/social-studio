"use client";

import { useEffect, useMemo, useState } from "react";
import { checkRemote, remoteLayers, type RemoteOutcome } from "@/lib/french/client";
import { checkLocal, mergeIssues } from "@/lib/french/engine";
import { resolvePrefs } from "@/lib/french/prefs";
import type { CheckContext, FrenchIssue } from "@/lib/french/types";
import type { Engine } from "@/types/domain";

const REMOTE_DELAY_MS = 900;

export interface FrenchCheckState {
  issues: FrenchIssue[];
  /** État des couches distantes pour l'indicateur (absent : couche non demandée). */
  remote: RemoteOutcome;
  pending: boolean;
}

/**
 * Analyse d'un texte : couche locale à chaque frappe (synchrone, hors ligne), couches
 * distantes après une pause de frappe, fusionnées par position.
 */
export function useFrenchCheck(
  text: string,
  ctx: CheckContext | undefined,
  options: {
    engine?: Engine;
    remote?: boolean;
    categoryId?: string;
    mode?: CheckContext["mode"];
  } = {},
): FrenchCheckState {
  const full = useMemo(
    () => (ctx ? { ...ctx, categoryId: options.categoryId, mode: options.mode } : undefined),
    [ctx, options.categoryId, options.mode],
  );
  const local = useMemo(() => (full ? checkLocal(text, full) : []), [text, full]);
  const layers = useMemo(
    () =>
      full && options.remote !== false
        ? remoteLayers(resolvePrefs(full.prefs), options.engine ?? "native")
        : [],
    [full, options.remote, options.engine],
  );
  const [remote, setRemote] = useState<{ text: string; outcome: RemoteOutcome } | null>(null);

  useEffect(() => {
    if (layers.length === 0 || !text.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkRemote(text, layers, options.engine ?? "native", controller.signal)
        .then((outcome) => setRemote({ text, outcome }))
        .catch(() => {});
    }, REMOTE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, layers, options.engine]);

  const current = remote && remote.text === text ? remote.outcome : undefined;
  const issues = useMemo(() => {
    if (!full) return local;
    const distant = [...(current?.languagetool?.issues ?? []), ...(current?.ai?.issues ?? [])];
    return distant.length > 0 ? mergeIssues(text, local, distant, full) : local;
  }, [full, local, current, text]);

  return { issues, remote: current ?? {}, pending: layers.length > 0 && !current };
}
