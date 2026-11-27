"use client";

import { CheckCircle2, CircleAlert, TriangleAlert, Wand2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IssueActions } from "@/hooks/useIssueActions";
import { isAutoFixable, issueSummary } from "@/lib/french/engine";
import type { RemoteOutcome } from "@/lib/french/client";
import type { FrenchIssue } from "@/lib/french/types";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IssueCard } from "./IssueCard";

/** Libellé du badge (section 6.4) : « Français : 0 faute », « 2 points à vérifier », « 1 faute ». */
export function badgeLabel(issues: readonly FrenchIssue[]): {
  text: string;
  tone: "ok" | "check" | "error";
} {
  const { errors, toCheck } = issueSummary(issues);
  if (errors > 0) return { text: plural(errors, "faute"), tone: "error" };
  if (toCheck > 0)
    return { text: plural(toCheck, "point à vérifier", "points à vérifier"), tone: "check" };
  return { text: "Français : 0 faute", tone: "ok" };
}

function layerNotes(remote: RemoteOutcome): string[] {
  const notes: string[] = [];
  if (remote.languagetool?.status === "unavailable")
    notes.push("LanguageTool indisponible : seule la couche locale a vérifié ce texte.");
  if (remote.ai?.status === "unavailable") notes.push("Relecture IA indisponible.");
  return notes;
}

/**
 * Badge de qualité d'un texte et liste de ses alertes (accessible au clavier), avec
 * « Tout corriger » : fautes sûres et typographie, les « À vérifier » restent manuels.
 */
export function FrenchBadge({
  issues,
  actions,
  remote = {},
  onExplain,
}: {
  issues: readonly FrenchIssue[];
  actions: IssueActions;
  remote?: RemoteOutcome;
  onExplain?: (ruleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = badgeLabel(issues);
  const fixable = issues.filter(isAutoFixable);
  const notes = layerNotes(remote);
  const Icon =
    label.tone === "error" ? CircleAlert : label.tone === "check" ? TriangleAlert : CheckCircle2;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          className={cn(
            "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold pointer-coarse:h-9",
            label.tone === "error" && "bg-danger/10 text-danger",
            label.tone === "check" && "bg-warning/10 text-warning",
            label.tone === "ok" && "bg-success/10 text-success",
          )}
          aria-label={`Atelier Français : ${label.text}. Voir les alertes`}
          data-testid="french-badge"
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label.text}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            aria-label="Alertes de l'Atelier Français"
            className="z-50 flex max-h-[70vh] w-96 max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-y-auto rounded-xl bg-surface-float p-4 shadow-float squircle"
          >
            {issues.length === 0 ? (
              <p className="text-subheadline text-muted-foreground">Aucune alerte sur ce texte.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="border-b-[0.5px] border-separator pb-3 last:border-b-0 last:pb-0"
                  >
                    <p className="mb-1 text-footnote text-muted-foreground">
                      « {issue.excerpt.trim() || "espace"} »
                    </p>
                    <IssueCard
                      issue={issue}
                      actions={actions}
                      onDone={() => undefined}
                      onExplain={onExplain}
                    />
                  </li>
                ))}
              </ul>
            )}
            {notes.map((note) => (
              <p key={note} className="text-footnote text-muted-foreground">
                {note}
              </p>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {fixable.length > 0 ? (
        <Button size="sm" variant="tinted" onClick={() => actions.fixAll(issues)}>
          <Wand2 aria-hidden="true" />
          Tout corriger
        </Button>
      ) : null}
      {notes.length > 0 ? (
        <span className="text-footnote text-muted-foreground" role="status">
          {notes[0]}
        </span>
      ) : null}
    </div>
  );
}
