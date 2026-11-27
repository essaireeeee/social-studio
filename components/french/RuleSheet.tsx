"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getFrenchRule } from "@/lib/french/rules";
import { LEVEL_LABELS, SEVERITY_LABELS } from "@/lib/french/types";
import { FAMILY_LABELS } from "@/lib/french/labels";

/** Fiche d'une règle : explication en deux phrases et exemples MMA (« Comprendre la règle »). */
export function RuleSheet({ ruleId, onClose }: { ruleId: string | null; onClose: () => void }) {
  const rule = ruleId ? getFrenchRule(ruleId) : undefined;
  return (
    <Dialog open={Boolean(rule)} onOpenChange={(open) => !open && onClose()}>
      {rule ? (
        <DialogContent>
          <DialogTitle>{rule.title}</DialogTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{FAMILY_LABELS[rule.family]}</Badge>
            <Badge>
              Niveau {rule.level} · {LEVEL_LABELS[rule.level]}
            </Badge>
            <Badge
              variant={
                rule.severity === "error"
                  ? "danger"
                  : rule.severity === "warning"
                    ? "warning"
                    : "neutral"
              }
            >
              {rule.confidence === "medium" ? "À vérifier" : SEVERITY_LABELS[rule.severity]}
            </Badge>
          </div>
          <DialogDescription className="text-body text-foreground">
            {rule.explanation}
          </DialogDescription>
          <section aria-label="Exemples" className="flex flex-col gap-2">
            <h3 className="text-footnote font-semibold tracking-wide text-muted-foreground uppercase">
              Exemples
            </h3>
            <ul className="flex flex-col gap-2">
              {rule.examples.map((example) => (
                <li
                  key={example.wrong}
                  className="flex flex-col gap-0.5 rounded-lg bg-surface-2 p-3 text-subheadline"
                >
                  <span className="text-danger">
                    <span className="sr-only">Fautif : </span>✗ {example.wrong}
                  </span>
                  <span className="text-success">
                    <span className="sr-only">Correct : </span>✓ {example.right}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
