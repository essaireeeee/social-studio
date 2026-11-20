/**
 * Cycle de vie des profils de style (section 8.8) :
 * calcul → profil « proposé » → comparaison avec le profil actif → validation par un admin.
 * Seul le dernier profil validé d'un mode alimente les moteurs.
 */
import type { DataRepository } from "@/lib/database/repository";
import type { Mode, StyleProfile, UserProfile, Wording } from "@/types/domain";
import { canEditRules } from "./rule-service";
import { DEFAULT_CTA_LEXICON, DEFAULT_STYLE_BY_MODE, RULE_IDS } from "./rules";
import { buildStyleProfile } from "./style-extractor";

/** Un import de plus de 10 publications relance l'analyse des modes concernés. */
export const AUTO_RECOMPUTE_THRESHOLD = 10;
/** Profils proposés conservés par mode (les profils validés sont tous gardés). */
const KEPT_PROPOSALS = 5;

export class ProfileValidationError extends Error {
  override name = "ProfileValidationError";
}

export interface ComputeOptions {
  includeDemo?: boolean;
  now?: Date;
}

const sortNewestFirst = (profiles: StyleProfile[]) =>
  [...profiles].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export async function listProfiles(
  repository: DataRepository,
  mode: Mode,
): Promise<StyleProfile[]> {
  return sortNewestFirst(
    await repository.styleProfiles.list({ where: { index: "mode", equals: mode } }),
  );
}

/** Profil validé le plus récent : celui qu'utilisent les moteurs. */
export function activeProfile(profiles: readonly StyleProfile[]): StyleProfile | undefined {
  return [...profiles]
    .filter((p) => p.status === "validated")
    .sort((a, b) => (b.validatedAt ?? b.createdAt).localeCompare(a.validatedAt ?? a.createdAt))[0];
}

/** Profil proposé plus récent que le profil actif : à comparer puis valider. */
export function pendingProfile(profiles: readonly StyleProfile[]): StyleProfile | undefined {
  const active = activeProfile(profiles);
  return sortNewestFirst(profiles.filter((p) => p.status === "proposed")).find(
    (p) => !active || p.createdAt > (active.validatedAt ?? active.createdAt),
  );
}

async function pruneProposals(repository: DataRepository, mode: Mode): Promise<void> {
  const proposals = (await listProfiles(repository, mode)).filter((p) => p.status === "proposed");
  for (const old of proposals.slice(KEPT_PROPOSALS)) await repository.styleProfiles.delete(old.id);
}

/** Analyse la bibliothèque du mode et enregistre un profil « proposé ». */
export async function computeProfile(
  repository: DataRepository,
  mode: Mode,
  options: ComputeOptions = {},
): Promise<StyleProfile> {
  const [wordings, fighters, events, signatures, rules, settings] = await Promise.all([
    repository.wordings.list({ where: { index: "mode", equals: mode } }),
    repository.fighters.list(),
    repository.events.list(),
    repository.signatures.list(),
    repository.rules.list(),
    repository.getSettings(),
  ]);
  const ctaRule = rules.find((rule) => rule.id === RULE_IDS.ctaLexicon);
  const profile = buildStyleProfile({
    mode,
    wordings,
    fighters,
    events,
    signatures,
    ctaLexicon: ctaRule ? (ctaRule.enabled ? (ctaRule.values ?? []) : []) : DEFAULT_CTA_LEXICON,
    broadcasters: settings.quickOptions.broadcasters.filter((b) => !["Autre", "Aucun"].includes(b)),
    includeDemo: options.includeDemo,
    now: options.now,
  });
  await repository.styleProfiles.put(profile);
  await pruneProposals(repository, mode);
  return profile;
}

export async function validateProfile(
  repository: DataRepository,
  user: UserProfile | undefined,
  id: string,
  now: Date = new Date(),
): Promise<StyleProfile> {
  if (!canEditRules(user)) {
    throw new ProfileValidationError("Validation réservée au rôle administrateur.");
  }
  const profile = await repository.styleProfiles.get(id);
  if (!profile) throw new ProfileValidationError("Profil introuvable.");
  if (profile.includesDemo) {
    throw new ProfileValidationError(
      "Ce profil inclut les exemples fictifs : il ne peut pas alimenter les moteurs.",
    );
  }
  return repository.styleProfiles.put({
    ...profile,
    status: "validated",
    validatedBy: user!.id,
    validatedAt: now.toISOString(),
  });
}

/** Après un import : recalcul automatique des modes concernés au-delà de 10 publications. */
export async function recomputeAfterImport(
  repository: DataRepository,
  imported: readonly Pick<Wording, "mode">[],
  now: Date = new Date(),
): Promise<StyleProfile[]> {
  if (imported.length <= AUTO_RECOMPUTE_THRESHOLD) return [];
  const modes = [...new Set(imported.map((w) => w.mode))];
  const profiles: StyleProfile[] = [];
  for (const mode of modes) profiles.push(await computeProfile(repository, mode, { now }));
  return profiles;
}

// ---------------------------------------------------------------------------
// Paramètres pour les moteurs
// ---------------------------------------------------------------------------

export interface StyleParameters {
  /** `profile` : mesures d'un profil validé ; `defaults` : valeurs de `rules.ts`. */
  source: "profile" | "defaults";
  corpusSize: number;
  charsMedian: number;
  charsP90: number;
  linesMedian: number;
  emojisPerPostMedian: number;
  /** Au-delà, le linter signale une surcharge d'emojis. */
  emojiThreshold: number;
  hashtagsPerPostMedian: number;
  hashtagPosition: "end" | "inline" | "mixed";
}

export function styleParameters(profile: StyleProfile | undefined, mode: Mode): StyleParameters {
  if (!profile || profile.status !== "validated" || profile.confidence === "insufficient") {
    return {
      source: "defaults",
      corpusSize: profile?.corpusSize ?? 0,
      ...DEFAULT_STYLE_BY_MODE[mode],
    };
  }
  return {
    source: "profile",
    corpusSize: profile.corpusSize,
    charsMedian: profile.length.charsMedian,
    charsP90: profile.length.charsP90,
    linesMedian: profile.length.linesMedian,
    emojisPerPostMedian: profile.emojis.perPostMedian,
    emojiThreshold: Math.ceil(profile.emojis.perPostP90),
    hashtagsPerPostMedian: profile.hashtags.perPostMedian,
    hashtagPosition: profile.hashtags.position,
  };
}

// ---------------------------------------------------------------------------
// Comparaison
// ---------------------------------------------------------------------------

export interface ProfileDiffRow {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

const percent = (value: number) => `${Math.round(value * 100)} %`;
const CONFIDENCE_LABELS: Record<StyleProfile["confidence"], string> = {
  insufficient: "Insuffisante",
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
};
const POSITION_LABELS: Record<StyleProfile["hashtags"]["position"], string> = {
  end: "En fin de post",
  inline: "Dans le texte",
  mixed: "Mixte",
};

const INDICATORS: { key: string; label: string; read: (p: StyleProfile) => string }[] = [
  { key: "corpusSize", label: "Publications analysées", read: (p) => String(p.corpusSize) },
  { key: "confidence", label: "Confiance", read: (p) => CONFIDENCE_LABELS[p.confidence] },
  {
    key: "charsMedian",
    label: "Longueur médiane (caractères)",
    read: (p) => String(p.length.charsMedian),
  },
  { key: "charsP90", label: "Longueur p90 (caractères)", read: (p) => String(p.length.charsP90) },
  {
    key: "linesMedian",
    label: "Lignes par post (médiane)",
    read: (p) => String(p.length.linesMedian),
  },
  {
    key: "emojisMedian",
    label: "Emojis par post (médiane)",
    read: (p) => String(p.emojis.perPostMedian),
  },
  { key: "emojisP90", label: "Emojis par post (p90)", read: (p) => String(p.emojis.perPostP90) },
  { key: "topEmoji", label: "Emoji le plus fréquent", read: (p) => p.emojis.top[0]?.emoji ?? "-" },
  {
    key: "hashtagsMedian",
    label: "Hashtags par post (médiane)",
    read: (p) => String(p.hashtags.perPostMedian),
  },
  {
    key: "hashtagPosition",
    label: "Position des hashtags",
    read: (p) => POSITION_LABELS[p.hashtags.position],
  },
  {
    key: "hooksUpper",
    label: "Accroches en majuscules",
    read: (p) => percent(p.hooks.uppercaseRatio),
  },
  {
    key: "hooksExclamation",
    label: "Accroches avec « ! »",
    read: (p) => percent(p.hooks.exclamationRatio),
  },
  { key: "hookWords", label: "Mots par accroche", read: (p) => String(p.hooks.avgWords) },
  {
    key: "topStructure",
    label: "Structure la plus fréquente",
    read: (p) => p.structures.find((s) => !s.categoryId)?.fingerprint ?? "-",
  },
  {
    key: "topCta",
    label: "CTA le plus fréquent",
    read: (p) => p.ctas.top.find((c) => !c.categoryId)?.text ?? "-",
  },
  { key: "overused", label: "Expressions à varier", read: (p) => String(p.overused.length) },
];

export function diffProfiles(
  before: StyleProfile | undefined,
  after: StyleProfile,
): ProfileDiffRow[] {
  return INDICATORS.map(({ key, label, read }) => {
    const previous = before ? read(before) : "-";
    const next = read(after);
    return {
      key,
      label,
      before: previous,
      after: next,
      changed: before !== undefined && previous !== next,
    };
  });
}

export { CONFIDENCE_LABELS, POSITION_LABELS };
