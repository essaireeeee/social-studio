/**
 * Entraînement (section 6.5) : séries de 10 exercices courts, tirés des propres erreurs
 * passées du CM et des exemples des règles concernées. Rédigés pour l'application, jamais
 * repris d'une source externe. Logique pure, déterministe pour une graine donnée.
 */
import type { FrenchIssueRecord, FrenchRuleFamily } from "@/types/v2";
import { FRENCH_RULES, getFrenchRule } from "./rules";
import { weakPoints } from "./stats";
import type { FrenchRule } from "./types";

export const SERIES_LENGTH = 10;

export interface Exercise {
  id: string;
  ruleId: string;
  family: FrenchRuleFamily;
  kind: "gap" | "choice";
  /** Phrase à trou (avec « ___ ») ou consigne du choix. */
  prompt: string;
  options: [string, string];
  answer: string;
  explanation: string;
}

export type TrainingProgress = Partial<
  Record<FrenchRuleFamily, { answered: number; correct: number }>
>;

function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Plus petit passage qui diffère entre deux phrases (préfixe et suffixe communs retirés). */
export function difference(
  wrong: string,
  right: string,
): { before: string; wrong: string; right: string; after: string } {
  let start = 0;
  while (start < wrong.length && start < right.length && wrong[start] === right[start]) start += 1;
  let endW = wrong.length;
  let endR = right.length;
  while (endW > start && endR > start && wrong[endW - 1] === right[endR - 1]) {
    endW -= 1;
    endR -= 1;
  }
  // Élargit aux mots entiers.
  while (start > 0 && /[\p{L}'’-]/u.test(wrong[start - 1]!)) start -= 1;
  while (endW < wrong.length && /[\p{L}'’-]/u.test(wrong[endW]!)) {
    endW += 1;
    endR += 1;
  }
  return {
    before: wrong.slice(0, start),
    wrong: wrong.slice(start, endW),
    right: right.slice(start, endR),
    after: wrong.slice(endW),
  };
}

function fromExample(rule: FrenchRule, index: number, shuffle: () => number): Exercise | null {
  const example = rule.examples[index];
  if (!example) return null;
  const diff = difference(example.wrong, example.right);
  const swap = shuffle() < 0.5;
  if (
    diff.wrong.trim() &&
    diff.right.trim() &&
    diff.wrong.length <= 30 &&
    diff.right.length <= 30
  ) {
    return {
      id: `${rule.id}:${index}:gap`,
      ruleId: rule.id,
      family: rule.family,
      kind: "gap",
      prompt: `${diff.before}___${diff.after}`,
      options: swap ? [diff.right, diff.wrong] : [diff.wrong, diff.right],
      answer: diff.right,
      explanation: rule.explanation,
    };
  }
  return {
    id: `${rule.id}:${index}:choice`,
    ruleId: rule.id,
    family: rule.family,
    kind: "choice",
    prompt: "Quelle phrase est correcte ?",
    options: swap ? [example.right, example.wrong] : [example.wrong, example.right],
    answer: example.right,
    explanation: rule.explanation,
  };
}

function fromRecord(record: FrenchIssueRecord, shuffle: () => number): Exercise | null {
  const rule = getFrenchRule(record.ruleId);
  if (!rule || !record.correction || record.correction.trim() === record.excerpt.trim())
    return null;
  const swap = shuffle() < 0.5;
  const options: [string, string] = swap
    ? [record.correction, record.excerpt]
    : [record.excerpt, record.correction];
  return {
    id: `${record.id}:mine`,
    ruleId: rule.id,
    family: rule.family,
    kind: "choice",
    prompt: "Vous aviez écrit l'une de ces formes. Laquelle est correcte ?",
    options,
    answer: record.correction,
    explanation: rule.explanation,
  };
}

/**
 * Série de 10 : d'abord les erreurs passées du CM, puis les exemples des règles où il se
 * trompe le plus, complétés au hasard (graine) parmi les autres règles.
 */
export function buildSeries(
  records: readonly FrenchIssueRecord[],
  seed: number,
  now: Date,
): Exercise[] {
  const shuffle = random(seed);
  const series: Exercise[] = [];
  const seen = new Set<string>();
  const push = (exercise: Exercise | null) => {
    if (!exercise || series.length >= SERIES_LENGTH) return;
    const key = `${exercise.ruleId}|${exercise.options.slice().sort().join("|")}`;
    if (seen.has(key)) return;
    seen.add(key);
    series.push(exercise);
  };

  const own = records
    .filter((r) => r.author === "cm" && r.correction)
    .slice(-30)
    .reverse();
  for (const record of own) {
    if (series.length >= 4) break;
    push(fromRecord(record, shuffle));
  }
  for (const point of weakPoints(records, now, 5) ?? []) {
    const rule = getFrenchRule(point.ruleId);
    if (rule) rule.examples.forEach((_, i) => push(fromExample(rule, i, shuffle)));
  }
  const pool = FRENCH_RULES.filter((r) => r.family !== "typographie" && r.exactFix !== false);
  let guard = 0;
  while (series.length < SERIES_LENGTH && guard < 500) {
    guard += 1;
    const rule = pool[Math.floor(shuffle() * pool.length)]!;
    push(fromExample(rule, Math.floor(shuffle() * rule.examples.length), shuffle));
  }
  return series;
}

export function recordAnswer(
  progress: TrainingProgress,
  exercise: Exercise,
  correct: boolean,
): TrainingProgress {
  const current = progress[exercise.family] ?? { answered: 0, correct: 0 };
  return {
    ...progress,
    [exercise.family]: {
      answered: current.answered + 1,
      correct: current.correct + (correct ? 1 : 0),
    },
  };
}
