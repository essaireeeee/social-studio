"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { canEditRules, loadRules, saveRule, setRuleEnabled } from "@/lib/editorial/rule-service";
import type { UserProfile } from "@/types/domain";
import { RuleEditor } from "./RuleEditor";

interface RulesSectionProps {
  repository: DexieRepository;
  user: UserProfile | null | undefined;
}

/** Règles éditoriales : lecture pour tous, activation et modification pour l'administrateur. */
export function RulesSection({ repository, user }: RulesSectionProps) {
  const rules = useLiveQuery(() => loadRules(repository), [repository]);
  const canEdit = canEditRules(user ?? undefined);

  return (
    <section aria-labelledby="rules-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="rules-title" className="text-base font-semibold">
          Règles éditoriales
        </h2>
        <p className="text-13 text-muted-foreground">
          Appliquées à chaque texte produit ou modifié dans le Studio : corrections automatiques et
          avertissements.{" "}
          {canEdit
            ? "Vous pouvez les activer, les désactiver et les modifier."
            : "Modification réservée au rôle administrateur."}
        </p>
      </div>
      {!rules ? (
        <div className="h-32 animate-pulse rounded-xl bg-card squircle" aria-hidden />
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              canEdit={canEdit}
              onToggle={async (enabled) => {
                await setRuleEnabled(repository, user ?? undefined, rule.id, enabled);
              }}
              onSave={async (next) => {
                await saveRule(repository, user ?? undefined, next);
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
