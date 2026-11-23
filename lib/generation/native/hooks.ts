/**
 * Banque d'accroches validées (section 10.5) : le CM garde une accroche depuis une
 * variante ; elle est généralisée en patron (faits → variables, emojis → {E}) puis
 * proposée comme option d'accroche pour la même catégorie et le même mode.
 */
import type { DataRepository } from "@/lib/database/repository";
import { newId } from "@/lib/database/hash";
import { emojiRegex, escapeRegex } from "@/lib/editorial/text-utils";
import type { Mode, SavedHook } from "@/types/domain";
import type { VariableMap } from "./types";

/** Variables jamais généralisées (blocs entiers ou textes libres trop longs). */
const SKIPPED = new Set(["hashtags", "cta", "signature", "fightsList", "schedule", "body"]);

/** « fighterA » → « FIGHTER_A_UPPER » */
const upperName = (key: string) => `${key.replace(/([A-Z])/g, "_$1").toUpperCase()}_UPPER`;

export function generalizeHook(hook: string, vars: VariableMap): string {
  let pattern = hook.replace(emojiRegex(), "{E}");
  const entries = Object.entries(vars)
    .filter(([key, value]) => !SKIPPED.has(key) && value.length >= 2 && !value.includes("\n"))
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, value] of entries) {
    const upper = value.toLocaleUpperCase("fr-FR");
    if (upper !== value && pattern.includes(upper)) {
      pattern = pattern.replace(new RegExp(escapeRegex(upper), "g"), `{${upperName(key)}}`);
    }
    pattern = pattern.replace(new RegExp(escapeRegex(value), "g"), `{${key}}`);
  }
  return pattern.replace(/(\{E\}\s*){2,}/g, "{E} ").trim();
}

export async function loadHookBank(repository: DataRepository): Promise<SavedHook[]> {
  return (await repository.getMeta("hookBank")) ?? [];
}

export async function saveHook(
  repository: DataRepository,
  entry: { mode: Mode; categoryId: string; text: string; vars: VariableMap },
  now: Date = new Date(),
): Promise<SavedHook> {
  const bank = await loadHookBank(repository);
  const pattern = generalizeHook(entry.text, entry.vars);
  const existing = bank.find(
    (h) => h.mode === entry.mode && h.categoryId === entry.categoryId && h.pattern === pattern,
  );
  if (existing) return existing;
  const saved: SavedHook = {
    id: newId(),
    mode: entry.mode,
    categoryId: entry.categoryId,
    text: entry.text.trim(),
    pattern,
    createdAt: now.toISOString(),
  };
  await repository.setMeta("hookBank", [...bank, saved]);
  return saved;
}

export async function removeHook(repository: DataRepository, id: string): Promise<void> {
  const bank = await loadHookBank(repository);
  await repository.setMeta(
    "hookBank",
    bank.filter((h) => h.id !== id),
  );
}
