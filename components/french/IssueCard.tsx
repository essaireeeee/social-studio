"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IssueActions } from "@/hooks/useIssueActions";
import { getFrenchRule } from "@/lib/french/rules";
import type { FrenchIssue } from "@/lib/french/types";
import { cn } from "@/lib/utils";

const LAYER_LABELS = {
  local: "Atelier Français",
  languagetool: "LanguageTool",
  ai: "Relecture IA",
} as const;

/** Libellé de gravité : « Faute », « À vérifier » ou « Suggestion ». */
export function issueTone(issue: FrenchIssue): { label: string; className: string } {
  if (issue.severity === "suggestion")
    return { label: "Suggestion", className: "text-[#0060df] dark:text-[#64a8ff]" };
  if (issue.severity === "error" && issue.confidence === "high")
    return { label: "Faute", className: "text-danger" };
  return { label: "À vérifier", className: "text-warning" };
}

/** Un mot seul (ou un nom) : candidat au dictionnaire maison. */
const dictionaryCandidate = (issue: FrenchIssue) =>
  issue.family !== "typographie" && /^[\p{L}][\p{L}'’-]{1,40}$/u.test(issue.excerpt.trim());

/**
 * Fiche d'une alerte (section 6.4) : règle en une ligne, correction proposée en gras,
 * Corriger, Ignorer ici, Ignorer cette règle, Ajouter au dictionnaire, Comprendre la règle.
 */
export function IssueCard({
  issue,
  actions,
  onDone,
  onExplain,
}: {
  issue: FrenchIssue;
  actions: IssueActions;
  onDone: () => void;
  onExplain?: (ruleId: string) => void;
}) {
  const tone = issueTone(issue);
  const rule = issue.layer === "local" ? getFrenchRule(issue.ruleId) : undefined;
  const run = (fn: () => void) => () => {
    fn();
    onDone();
  };
  return (
    <div className="flex flex-col gap-3" data-testid="french-issue">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-footnote">
          <span className={cn("font-semibold", tone.className)}>{tone.label}</span>
          <span className="text-muted-foreground">· {LAYER_LABELS[issue.layer]}</span>
        </p>
        <p className="text-subheadline text-foreground">{issue.message}</p>
        {issue.replacement !== undefined ? (
          <p className="text-subheadline">
            <span className="text-muted-foreground line-through">
              {issue.excerpt.trim() || "espace"}
            </span>
            {" → "}
            <strong className="font-semibold">{issue.replacement.trim() || "(supprimer)"}</strong>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {issue.replacement !== undefined ? (
          <Button size="sm" onClick={run(() => actions.correct(issue))}>
            Corriger
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" onClick={run(() => actions.ignoreHere(issue))}>
          Ignorer ici
        </Button>
        {rule ? (
          <Button size="sm" variant="secondary" onClick={run(() => actions.disableRule(issue))}>
            Ignorer cette règle
          </Button>
        ) : null}
        {dictionaryCandidate(issue) ? (
          <Button size="sm" variant="secondary" onClick={run(() => actions.addToDictionary(issue))}>
            Ajouter au dictionnaire
          </Button>
        ) : null}
      </div>
      {rule && onExplain ? (
        <button
          type="button"
          onClick={() => onExplain(rule.id)}
          className="flex cursor-pointer items-center gap-1.5 self-start text-footnote text-accent-text hover:underline"
        >
          <BookOpen className="size-3.5" aria-hidden="true" />
          Comprendre la règle
        </button>
      ) : null}
    </div>
  );
}
