"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Chip } from "@/components/ui/chip";
import { GroupedSection } from "@/components/ui/grouped-list";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { useActiveUser, useRepository } from "@/hooks/useRepository";
import { canEditRules } from "@/lib/editorial/rule-service";
import { isRuleEnabled } from "@/lib/french/context";
import { FAMILY_LABELS } from "@/lib/french/labels";
import { FRENCH_RULES } from "@/lib/french/rules";
import { LEVEL_LABELS, SEVERITY_LABELS, type FrenchRule } from "@/lib/french/types";
import { toast } from "@/stores/toast.store";
import { FrenchRuleFamilySchema, type FrenchRuleFamily } from "@/types/v2";
import { RuleSheet } from "../RuleSheet";

type LevelFilter = "all" | "1" | "2" | "3";
const LEVELS = [
  { value: "all", label: "Tous" },
  { value: "1", label: "Niveau 1" },
  { value: "2", label: "Niveau 2" },
  { value: "3", label: "Niveau 3" },
] as const;

const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Référentiel (section 6.5) : règles par famille et niveau, recherche, interrupteur admin. */
export function RulesPage() {
  const repository = useRepository();
  const user = useActiveUser();
  const states = useLiveQuery(() => repository?.frenchRules.list(), [repository]);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<FrenchRuleFamily | "all">("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [ruleId, setRuleId] = useState<string | null>(null);
  const admin = canEditRules(user ?? undefined);

  const groups = useMemo(() => {
    const term = fold(query.trim());
    const visible = FRENCH_RULES.filter(
      (r) =>
        (family === "all" || r.family === family) &&
        (level === "all" || String(r.level) === level) &&
        (!term || fold(`${r.title} ${r.explanation}`).includes(term)),
    );
    return FrenchRuleFamilySchema.options
      .map((f) => ({ family: f, rules: visible.filter((r) => r.family === f) }))
      .filter((g) => g.rules.length > 0);
  }, [query, family, level]);
  const count = groups.reduce((n, g) => n + g.rules.length, 0);

  const toggle = async (rule: FrenchRule, enabled: boolean) => {
    if (!repository || !admin) return;
    await repository.frenchRules.put({
      id: rule.id,
      family: rule.family,
      level: rule.level,
      enabled,
      updatedAt: new Date().toISOString(),
    });
    toast(`${enabled ? "Règle activée" : "Règle désactivée"} : ${rule.title}`, "neutral");
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Référentiel</LargeTitle>
        <p className="text-subheadline text-muted-foreground">
          {FRENCH_RULES.length} règles rédigées pour l&apos;application, en{" "}
          {FrenchRuleFamilySchema.options.length} familles.{" "}
          {admin
            ? "Les interrupteurs s'appliquent à tous les textes."
            : "L'activation des règles est réservée au rôle administrateur."}
        </p>
      </header>
      <SearchField
        label="Rechercher une règle"
        value={query}
        onValueChange={setQuery}
        placeholder="Rechercher"
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={family === "all"} onClick={() => setFamily("all")}>
          Toutes
        </Chip>
        {FrenchRuleFamilySchema.options.map((f) => (
          <Chip key={f} selected={family === f} onClick={() => setFamily(f)}>
            {FAMILY_LABELS[f]}
          </Chip>
        ))}
      </div>
      <Segmented label="Niveau" value={level} options={LEVELS} onChange={setLevel} />
      <p className="px-1 text-footnote text-muted-foreground" role="status">
        {count} règle{count > 1 ? "s" : ""}
      </p>

      {groups.map((group) => (
        <GroupedSection
          key={group.family}
          id={`famille-${group.family}`}
          header={FAMILY_LABELS[group.family]}
        >
          {group.rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              enabled={states ? isRuleEnabled(rule.id, states) : rule.enabledByDefault !== false}
              admin={admin}
              onOpen={() => setRuleId(rule.id)}
              onToggle={(value) => void toggle(rule, value)}
            />
          ))}
        </GroupedSection>
      ))}
      <RuleSheet ruleId={ruleId} onClose={() => setRuleId(null)} />
    </div>
  );
}

function RuleRow({
  rule,
  enabled,
  admin,
  onOpen,
  onToggle,
}: {
  rule: FrenchRule;
  enabled: boolean;
  admin: boolean;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const severity = rule.confidence === "medium" ? "À vérifier" : SEVERITY_LABELS[rule.severity];
  return (
    <li className="relative flex min-h-11 items-center gap-3 px-4 py-2 before:pointer-events-none before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:origin-top before:scale-y-50 before:bg-separator first:before:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer flex-col py-0.5 text-left"
        data-testid="rule-row"
      >
        <span className="truncate text-body">{rule.title}</span>
        <span className="truncate text-subheadline text-muted-foreground">
          Niveau {rule.level} · {LEVEL_LABELS[rule.level]} · {severity}
        </span>
      </button>
      {admin ? (
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={`Activer la règle ${rule.title}`}
        />
      ) : enabled ? null : (
        <span className="shrink-0 text-footnote text-muted-foreground">Désactivée</span>
      )}
    </li>
  );
}
