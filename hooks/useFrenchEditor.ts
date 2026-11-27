"use client";

import { useMemo, useState } from "react";
import { buildCheckContext } from "@/lib/french/context";
import { ignoreKey } from "@/lib/french/engine";
import type { FrenchAuthor } from "@/lib/french/journal";
import type { FrenchIssue } from "@/lib/french/types";
import type { Mode } from "@/types/domain";
import { useFrenchCheck } from "./useFrenchCheck";
import { useFrenchSources } from "./useFrenchContext";
import { useIssueActions } from "./useIssueActions";

/**
 * Tout ce qu'un champ de saisie de l'Atelier Français utilise : alertes des trois couches,
 * actions (Corriger, Ignorer…), fiche de règle ouverte. « Ignorer ici » vaut pour ce champ.
 */
export function useFrenchEditor({
  text,
  onText,
  author,
  categoryId,
  mode,
}: {
  text: string;
  onText: (next: string) => void;
  author: FrenchAuthor;
  categoryId?: string;
  mode?: Mode;
}) {
  const sources = useFrenchSources();
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(new Set());
  const [explain, setExplain] = useState<string | null>(null);
  const ctx = useMemo(
    () => (sources ? { ...buildCheckContext(sources), ignored } : undefined),
    [sources, ignored],
  );
  const check = useFrenchCheck(text, ctx, {
    engine: sources?.settings.aiProvider,
    categoryId,
    mode,
  });
  const actions = useIssueActions({
    text,
    onText,
    author,
    onIgnore: (issue: FrenchIssue) => setIgnored((prev) => new Set(prev).add(ignoreKey(issue))),
  });
  return { ...check, ctx, actions, explain, setExplain, ready: Boolean(ctx) };
}
