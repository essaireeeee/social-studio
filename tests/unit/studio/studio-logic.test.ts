import { describe, expect, it } from "vitest";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import { buildBriefContext } from "@/lib/generation/native/context";
import { contextLines, declineNative } from "@/lib/generation/native/decline";
import { getCategory } from "@/lib/categories/registry";
import { postProcess } from "@/lib/generation/post-process";
import { buildAllowedFacts } from "@/lib/generation/fact-guard";
import { buildGeneration } from "@/lib/generation/variants";
import {
  EMPTY_DRAFTS,
  carryCommon,
  defaultHashtagIds,
  draftErrors,
  draftFromBrief,
  hashtagIdsOf,
  resetDraft,
  selectCategory,
  signatureIdOf,
  toBrief,
} from "@/lib/studio/draft";
import { searchFighters } from "@/lib/studio/fighter-search";
import {
  contentStatus,
  markPublished,
  recordEdit,
  reopenGeneration,
  restoreRevision,
  selectVariant,
  validateVariant,
} from "@/lib/studio/revisions";
import type { Fighter, HashtagGroup, LiveSession, Signature } from "@/types/domain";

const NOW = new Date("2026-11-23T20:00:00.000Z");

const groups: HashtagGroup[] = [
  {
    id: "official",
    name: "Officiels",
    kind: "official",
    tags: ["#HexagoneMMA"],
    defaultOn: true,
    modes: ["live", "daily"],
    order: 0,
  },
  {
    id: "france",
    name: "MMA France",
    kind: "mma_france",
    tags: ["#MMAFrance"],
    defaultOn: false,
    modes: ["live", "daily"],
    order: 1,
  },
  {
    id: "event",
    name: "Soirée",
    kind: "event",
    tags: ["#HEXA12"],
    defaultOn: true,
    modes: ["live"],
    order: 2,
  },
];

const signatures: Signature[] = [
  {
    id: "sig-daily",
    name: "Billetterie",
    template: "🎫 {ticketLink}",
    requiredFields: ["ticketLink"],
    requiresConfirmedSchedule: false,
    modes: ["daily"],
    enabled: true,
    order: 0,
  },
  {
    id: "sig-off",
    name: "Désactivée",
    template: "x",
    requiredFields: [],
    requiresConfirmedSchedule: false,
    modes: ["daily"],
    enabled: false,
    order: 1,
  },
];

const session: LiveSession = {
  id: "s1",
  eventName: "HEXAGONE MMA",
  eventNumber: 12,
  city: "Paris",
  venue: "Salle Test",
  date: "2026-03-14",
  startedAt: NOW.toISOString(),
  active: true,
};

describe("brouillon du Studio (section 13.3)", () => {
  it("catégorie : préréglages, champs saisis, contexte de la session", () => {
    const draft = selectCategory(
      { ...EMPTY_DRAFTS.live, fields: { winner: "Karim Fictif" } },
      "live_ko",
      session,
    );
    expect(draft).toMatchObject({
      categoryId: "live_ko",
      fields: { winner: "Karim Fictif", method: "KO" },
    });
    // Le préréglage KO ne suit pas vers la soumission.
    const sub = selectCategory(draft, "live_sub");
    expect(sub.fields).toEqual({ winner: "Karim Fictif", method: "Soumission" });
  });

  it("champs communs d'un mode à l'autre, jamais la catégorie", () => {
    const drafts = {
      live: {
        ...EMPTY_DRAFTS.live,
        categoryId: "live_ko",
        fields: { winner: "Karim Fictif", round: "R2" },
      },
      daily: {
        ...EMPTY_DRAFTS.daily,
        categoryId: "daily_fight_announce",
        platform: "facebook" as const,
        fields: {},
      },
    };
    const next = carryCommon(drafts, "live", "daily");
    expect(next.daily).toEqual({ ...drafts.daily, fields: { winner: "Karim Fictif" } });
  });

  it("hashtags par défaut selon `defaultOn` et le mode, puis choix du CM", () => {
    expect(defaultHashtagIds(groups, "live")).toEqual(["official", "event"]);
    expect(defaultHashtagIds(groups, "daily")).toEqual(["official"]);
    expect(
      hashtagIdsOf({ ...EMPTY_DRAFTS.daily, hashtagIds: ["france", "event"] }, groups, "daily"),
    ).toEqual(["france"]);
  });

  it("signature : choix du CM, « Aucune », ou défaut de la catégorie", () => {
    expect(
      signatureIdOf({ ...EMPTY_DRAFTS.daily, signatureId: "sig-daily" }, signatures, "daily"),
    ).toBe("sig-daily");
    expect(
      signatureIdOf({ ...EMPTY_DRAFTS.daily, signatureId: null }, signatures, "daily"),
    ).toBeUndefined();
    expect(
      signatureIdOf({ ...EMPTY_DRAFTS.daily, signatureId: "sig-off" }, signatures, "daily"),
    ).toBeUndefined();
  });

  it("brief envoyé : seulement les champs de la catégorie, sans valeur vide", () => {
    const draft = {
      ...EMPTY_DRAFTS.live,
      categoryId: "live_ko",
      fields: {
        winner: "Karim Fictif",
        loser: "Tom Essai",
        method: "KO",
        fighterA: "Ali",
        round: "",
      },
      cta: "  ",
    };
    expect(toBrief(draft, "live", { groups, signatures, liveSessionId: "s1" })).toEqual({
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      fields: { winner: "Karim Fictif", loser: "Tom Essai", method: "KO" },
      hashtagIds: ["official", "event"],
      signatureId: undefined,
      cta: undefined,
      liveSessionId: "s1",
      freeInstruction: undefined,
    });
    expect(toBrief(draft, "daily", { groups, signatures })).toBeNull();
  });

  it("validation au clic sur Générer, réinitialisation", () => {
    expect(draftErrors(EMPTY_DRAFTS.live, "live")).toEqual({
      category: "Choisissez une catégorie.",
    });
    expect(
      draftErrors({ ...EMPTY_DRAFTS.live, categoryId: "live_ko", fields: { winner: "A" } }, "live"),
    ).toEqual({
      loser: "Perdant : champ requis.",
    });
    expect(resetDraft({ ...EMPTY_DRAFTS.live, platform: "x", categoryId: "live_ko" })).toEqual({
      platform: "x",
      fields: {},
    });
  });
});

describe("recherche de combattants", () => {
  const fighter = (
    id: string,
    firstName: string,
    lastName: string,
    nickname?: string,
  ): Fighter => ({
    id,
    firstName,
    lastName,
    nickname,
    fightHistory: [],
    updatedAt: NOW.toISOString(),
  });
  const pool = [
    fighter("1", "Karim", "Fictif", "Le Marteau"),
    fighter("2", "Tom", "Essai"),
    fighter("3", "Karine", "Exemple"),
    fighter("4", "Samba", "Sima"),
  ];

  it("dès 2 caractères, sur prénom, nom et surnom, accents et casse ignorés", () => {
    expect(searchFighters("k", pool)).toEqual([]);
    expect(searchFighters("kar", pool).map((f) => f.id)).toEqual(["1", "3"]);
    expect(searchFighters("marteau", pool).map((f) => f.id)).toEqual(["1"]);
    expect(searchFighters("ESSAI", pool).map((f) => f.id)).toEqual(["2"]);
  });

  it("tolère une faute de frappe, met la fight card de l'événement en premier", () => {
    expect(searchFighters("karin", pool).map((f) => f.id)).toEqual(["3", "1"]);
    expect(searchFighters("kar", pool, { priorityIds: ["3"] }).map((f) => f.id)).toEqual([
      "3",
      "1",
    ]);
  });
});

describe("révisions et statuts (sections 13.4 et 13.7)", () => {
  const generation = buildGeneration({
    brief: {
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      fields: {},
      hashtagIds: [],
    },
    engine: "native",
    variants: [
      { kind: "signature", text: "Texte A", factWarnings: [] },
      { kind: "punchy", text: "Texte B", factWarnings: [] },
    ],
    referenceIds: [],
    now: NOW,
  });
  const [sig, pun] = generation.variants;

  it("édition : `draft` → `editing`, frappes successives fusionnées", () => {
    const first = recordEdit(generation, sig!.id, { text: "Texte A1", factWarnings: [], now: NOW });
    expect(first.generation.status).toBe("editing");
    const merged = recordEdit(first.generation, sig!.id, {
      text: "Texte A12",
      factWarnings: [],
      now: NOW,
      mergeInto: first.revisionId,
    });
    const revisions = merged.generation.variants[0]!.revisions;
    expect(revisions.map((r) => [r.origin, r.text])).toEqual([
      ["native", "Texte A"],
      ["cm_edit", "Texte A12"],
    ]);
    const separate = recordEdit(merged.generation, sig!.id, {
      text: "Autre",
      factWarnings: [],
      now: NOW,
    });
    expect(separate.generation.variants[0]!.revisions).toHaveLength(3);
    expect(contentStatus(separate.generation, separate.generation.variants[0]!)).toBe("edited");
  });

  it("restauration : une nouvelle révision, rien n'est perdu", () => {
    const edited = recordEdit(generation, sig!.id, {
      text: "Modifié",
      factWarnings: [],
      now: NOW,
    }).generation;
    const back = restoreRevision(edited, sig!.id, sig!.revisions[0]!.id, NOW);
    const revisions = back.variants[0]!.revisions;
    expect(revisions.map((r) => [r.text, r.origin, r.action])).toEqual([
      ["Texte A", "native", undefined],
      ["Modifié", "cm_edit", undefined],
      ["Texte A", "native", "restore"],
    ]);
  });

  it("aperçu, validation, réouverture, publication : quatre états distincts", () => {
    expect(selectVariant(generation, pun!.id).variants.map((v) => v.selected)).toEqual([
      false,
      true,
    ]);
    const validated = validateVariant(generation, pun!.id, NOW);
    expect(validated).toMatchObject({
      status: "validated",
      finalText: "Texte B",
      finalPlatform: "instagram",
    });
    expect(contentStatus(validated, validated.variants[1]!)).toBe("validated");
    expect(contentStatus(validated, validated.variants[0]!)).toBe("generated");
    expect(selectVariant(validated, sig!.id)).toBe(validated);
    expect(reopenGeneration(validated, NOW)).not.toHaveProperty("finalText");
    const published = markPublished(generation, sig!.id, {
      publishedAt: "2026-11-23",
      url: "https://instagram.com/p/x",
      now: NOW,
    });
    expect(published).toMatchObject({
      status: "published",
      finalText: "Texte A",
      publishedAt: "2026-11-23",
      publishedUrl: "https://instagram.com/p/x",
    });
    expect(contentStatus(published, published.variants[0]!)).toBe("published");
  });
});

describe("déclinaison native", () => {
  const brief = {
    mode: "daily" as const,
    categoryId: "daily_fight_announce",
    platform: "instagram" as const,
    fields: {
      fighterA: "Karim Fictif",
      fighterB: "Tom Essai",
      event: "HEXAGONE MMA 13",
      date: "2026-03-14",
      city: "Paris",
    },
    hashtagIds: [],
  };
  const context = buildBriefContext(brief, getCategory(brief.categoryId)!, {
    fighters: [],
    hashtags: ["#HexagoneMMA"],
  });
  const process = (text: string, platform: "instagram" | "facebook" | "x" | "tiktok") =>
    postProcess(text, {
      lint: { rules: DEFAULT_EDITORIAL_RULES, categoryId: brief.categoryId, frenchSpacing: true },
      platform,
      allowed: buildAllowedFacts([...context.facts, "#HexagoneMMA"]),
      references: [],
    });
  const text =
    "🥊 Karim Fictif face à Tom Essai.\n\nLe choc de HEXAGONE MMA 13.\n\nDeux styles opposés.\n\n#HexagoneMMA";

  it("Facebook : contexte du brief ajouté, rien d'inventé", () => {
    expect(contextLines(text, context.vars)).toEqual(["🗓️ samedi 14 mars", "📍 Paris"]);
    const versions = declineNative(text, ["facebook", "tiktok", "x"], {
      vars: context.vars,
      process,
    });
    expect(versions.facebook!.text).toContain("📍 Paris");
    expect(versions.facebook!.factWarnings).toEqual([]);
    expect(versions.tiktok!.text).toBe(
      "🥊 Karim Fictif face à Tom Essai.\n\nLe choc de HEXAGONE MMA 13.\n\n#HexagoneMMA",
    );
    expect(versions.x!.text.length).toBeLessThanOrEqual(280);
  });

  it("réouverture depuis l'historique : le brief redevient un brouillon", () => {
    expect(draftFromBrief(brief)).toMatchObject({
      categoryId: "daily_fight_announce",
      signatureId: null,
    });
  });
});
