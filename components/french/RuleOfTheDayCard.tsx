"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useNow } from "@/hooks/useNow";
import { useRepository } from "@/hooks/useRepository";
import { isRuleEnabled } from "@/lib/french/context";
import { FAMILY_LABELS } from "@/lib/french/labels";
import { ruleOfTheDay } from "@/lib/french/stats";
import { toast } from "@/stores/toast.store";
import { useFrenchPrefs } from "./settings/useFrenchPrefs";

/**
 * Règle du jour (section 6.5) : tirée parmi les règles où le CM se trompe le plus, ou au
 * hasard (stable sur la journée). Masquable ici, réactivable dans Atelier Français > Réglages.
 */
export function RuleOfTheDayCard() {
  const repository = useRepository();
  const { prefs, save } = useFrenchPrefs();
  const data = useLiveQuery(async () => {
    if (!repository) return undefined;
    const [records, states] = await Promise.all([
      repository.frenchIssues.list(),
      repository.frenchRules.list(),
    ]);
    return { records, states };
  }, [repository]);
  const now = useNow(60 * 60 * 1000);

  if (!prefs?.ruleOfTheDay || !data || !now) return null;
  const rule = ruleOfTheDay(data.records, now, (id) => isRuleEnabled(id, data.states));
  const example = rule.examples[0];

  const hide = async () => {
    await save({ ruleOfTheDay: false });
    toast("Règle du jour masquée. Réactivable dans Atelier Français > Réglages.", "neutral");
  };

  return (
    <section
      aria-label="Règle du jour"
      className="flex flex-col gap-2 rounded-xl bg-card p-4 squircle"
      data-testid="rule-of-the-day"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Règle du jour · {FAMILY_LABELS[rule.family]}
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/french"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Atelier Français
          </Link>
          <button
            type="button"
            onClick={() => void hide()}
            className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline"
          >
            Masquer
          </button>
        </div>
      </div>
      <p className="text-headline">{rule.title}</p>
      <p className="text-subheadline text-muted-foreground">{rule.explanation}</p>
      {example ? (
        <p className="flex flex-col gap-0.5 rounded-lg bg-surface-2 p-3 text-subheadline">
          <span className="text-danger">
            <span className="sr-only">Fautif : </span>✗ {example.wrong}
          </span>
          <span className="text-success">
            <span className="sr-only">Correct : </span>✓ {example.right}
          </span>
        </p>
      ) : null}
    </section>
  );
}
