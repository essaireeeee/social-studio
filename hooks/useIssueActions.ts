"use client";

import { useCallback } from "react";
import { applyFixes, fixAll, isAutoFixable } from "@/lib/french/engine";
import { logIssues, type FrenchAuthor } from "@/lib/french/journal";
import type { FrenchIssue } from "@/lib/french/types";
import { getFrenchRule } from "@/lib/french/rules";
import { toast } from "@/stores/toast.store";
import { useRepository } from "./useRepository";

export interface IssueActions {
  correct: (issue: FrenchIssue) => void;
  ignoreHere: (issue: FrenchIssue) => void;
  disableRule: (issue: FrenchIssue) => void;
  addToDictionary: (issue: FrenchIssue) => void;
  fixAll: (issues: readonly FrenchIssue[]) => void;
}

/**
 * Actions sur une alerte (section 6.4) : Corriger, Ignorer ici, Ignorer cette règle,
 * Ajouter au dictionnaire, Tout corriger. Chaque geste est consigné dans `frenchIssues`.
 */
export function useIssueActions({
  text,
  onText,
  onIgnore,
  author,
}: {
  text: string;
  onText: (next: string) => void;
  onIgnore: (issue: FrenchIssue) => void;
  author: FrenchAuthor;
}): IssueActions {
  const repository = useRepository();
  const log = useCallback(
    (issues: readonly FrenchIssue[], resolution: Parameters<typeof logIssues>[2]) => {
      if (repository) void logIssues(repository, issues, resolution, author);
    },
    [repository, author],
  );

  return {
    correct: (issue) => {
      if (issue.replacement === undefined) return;
      onText(applyFixes(text, [issue]));
      log([issue], "corrected");
    },
    ignoreHere: (issue) => {
      onIgnore(issue);
      log([issue], "ignored_here");
    },
    disableRule: (issue) => {
      const rule = getFrenchRule(issue.ruleId);
      if (!repository || !rule) return;
      void repository.frenchRules
        .put({
          id: rule.id,
          family: rule.family,
          level: rule.level,
          enabled: false,
          updatedAt: new Date().toISOString(),
        })
        .then(() =>
          toast(`Règle désactivée : ${rule.title}. Réactivable dans le Référentiel.`, "neutral"),
        );
      log([issue], "rule_disabled");
    },
    addToDictionary: (issue) => {
      const word = issue.excerpt.trim();
      if (!repository || !word) return;
      void repository.frenchDictionary
        .put({
          id: crypto.randomUUID(),
          word,
          kind: "custom",
          origin: "cm",
          createdAt: new Date().toISOString(),
        })
        .then(() => toast(`« ${word} » ajouté au dictionnaire`, "success"));
      log([issue], "added_to_dictionary");
    },
    fixAll: (issues) => {
      const fixable = issues.filter(isAutoFixable);
      if (fixable.length === 0) return;
      onText(fixAll(text, fixable));
      log(fixable, "corrected");
    },
  };
}
