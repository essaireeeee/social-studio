import { beforeAll, describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/database/seed";
import { detectCta } from "@/lib/editorial/cta";
import { compileNameMatchers, hookPattern } from "@/lib/editorial/hook-pattern";
import {
  buildStyleProfile,
  collapseExpressions,
  confidenceFor,
  selectCorpus,
} from "@/lib/editorial/style-extractor";
import { structureFingerprint } from "@/lib/editorial/structure";
import type { StyleProfile, Wording } from "@/types/domain";
import { fixedNow } from "../../fixtures/entities";
import { BODY_A, CORPUS_FIGHTERS, buildStyleCorpus } from "../../fixtures/style-corpus";

let library: Wording[];
let profile: StyleProfile;

beforeAll(async () => {
  library = await buildStyleCorpus();
  profile = buildStyleProfile({
    mode: "live",
    wordings: library,
    fighters: CORPUS_FIGHTERS,
    now: fixedNow(),
    id: "profile-live",
  });
});

describe("corpus", () => {
  it("analyse les 20 publications LIVE réelles : démos, non-références et DAILY exclues", () => {
    expect(profile.corpusSize).toBe(20);
    expect(profile.corpusIds).not.toContain("demo-1");
    expect(profile.corpusIds).not.toContain("not-reference");
    expect(profile.corpusIds).not.toContain("daily-1");
    expect(profile.includesDemo).toBe(false);
    expect(profile.status).toBe("proposed");
  });

  it("inclut les démos seulement sur demande explicite", () => {
    expect(selectCorpus(library, "live", true)).toHaveLength(23);
    const withDemo = buildStyleProfile({ mode: "live", wordings: library, includeDemo: true });
    expect(withDemo.includesDemo).toBe(true);
    expect(withDemo.corpusSize).toBe(23);
  });

  it("analyse chaque mode séparément", () => {
    const daily = buildStyleProfile({ mode: "daily", wordings: library });
    expect(daily.corpusIds.sort()).toEqual(["daily-1", "daily-2"]);
  });

  it("niveau de confiance selon la taille du corpus", () => {
    expect([0, 4, 5, 14, 15, 49, 50].map(confidenceFor)).toEqual([
      "insufficient",
      "insufficient",
      "low",
      "low",
      "medium",
      "medium",
      "high",
    ]);
    expect(profile.confidence).toBe("medium");
  });
});

describe("emojis et hashtags", () => {
  it("compte les emojis et leur part de publications", () => {
    expect(profile.emojis.top.slice(0, 3)).toEqual([
      { emoji: "💥", count: 12, share: 0.6 },
      { emoji: "🏆", count: 8, share: 0.4 },
      { emoji: "🎫", count: 5, share: 0.25 },
    ]);
    expect(profile.emojis.perPostMedian).toBe(1);
    expect(profile.emojis.perPostP90).toBe(2);
  });

  it("compte les hashtags et détecte leur position en fin de post", () => {
    expect(profile.hashtags.top).toEqual([
      { tag: "#HexagoneMMA", count: 20 },
      { tag: "#MMAFrance", count: 6 },
    ]);
    expect(profile.hashtags.perPostMedian).toBe(1);
    expect(profile.hashtags.position).toBe("end");
  });
});

describe("CTA", () => {
  it("détecte les CTA dans les deux dernières lignes hors hashtags", () => {
    expect(profile.ctas.top.filter((c) => !c.categoryId)).toEqual([
      { text: "Rendez-vous samedi prochain.", count: 7 },
      { text: "Billetterie de la prochaine soirée : lien en bio", count: 5 },
    ]);
    expect(profile.ctas.top.find((c) => c.categoryId === "live_decision")?.count).toBe(5);
  });

  it("reconnaît un impératif en tête de ligne et ignore une ligne ordinaire", () => {
    expect(detectCta("KO !\n\nRejoignez-nous à la salle.")).toBe("Rejoignez-nous à la salle.");
    expect(detectCta("KO !\n\nUne soirée chez nous.")).toBeNull();
  });
});

describe("n-grammes, vocabulaire et expressions à varier", () => {
  it("compte les expressions récurrentes et leur part de posts", () => {
    expect(profile.ngrams.trigrams).toContainEqual({
      text: "trois rounds intenses",
      count: 8,
      share: 0.4,
    });
    expect(profile.ngrams.trigrams).toContainEqual({
      text: "rendez vous samedi",
      count: 7,
      share: 0.35,
    });
    // Pas d'expression qui commence ou finit par un mot vide.
    expect(profile.ngrams.bigrams.map((g) => g.text)).not.toContain("ko de");
    // Égalité à 8 occurrences entre « victoire », « decision », « unanime », « rounds »...
    expect(profile.vocabulary.top[0]?.count).toBe(8);
    expect(profile.vocabulary.top).toContainEqual({ word: "rounds", count: 8 });
    expect(profile.vocabulary.top.some((v) => v.word === "dans" || v.word === "une")).toBe(false);
  });

  it("n'utilise jamais un nom propre connu ni la marque comme expression", () => {
    const all = [
      ...profile.ngrams.bigrams,
      ...profile.ngrams.trigrams,
      ...profile.ngrams.quadgrams,
    ];
    expect(all.some((g) => /testeur|fictif|hexagone/.test(g.text))).toBe(false);
  });

  it("signale les expressions présentes dans plus de 25 % des posts", () => {
    const expressions = profile.overused.map((o) => o.expression);
    expect(expressions).toContain("{E} ko de {NOM} au {N}");
    expect(expressions).toContain("{E} victoire de {NOM} par");
    // Une phrase répétée est signalée entière, pas en fragments.
    expect(expressions).toContain("trois rounds intenses une maitrise totale");
    expect(expressions).toContain("la salle a vibre du debut a la fin");
    expect(expressions.some((e) => e.startsWith("vibre"))).toBe(false);
    expect(expressions).toContain("decision unanime");
    expect(expressions.filter((e) => e.includes("puissance"))).not.toHaveLength(0);
    // 6 posts sur 20 = 30 % : à varier. 5 sur 20 = 25 % : pas au-delà du seuil.
    expect(expressions.some((e) => e.includes("billetterie"))).toBe(false);
    expect(profile.overused.find((o) => o.expression.startsWith("trois rounds"))?.share).toBe(0.4);
  });
});

describe("accroches et structures", () => {
  it("dégage les patrons d'accroche fréquents", () => {
    expect(profile.hooks.patterns).toEqual([
      { pattern: "{E} ko de {NOM} au {N}", count: 12 },
      { pattern: "{E} victoire de {NOM} par", count: 8 },
    ]);
    expect(profile.hooks.exclamationRatio).toBe(0.6);
    expect(profile.hooks.samples.length).toBeGreaterThan(0);
  });

  it("reproduit l'exemple de la section 8.4", () => {
    const matchers = compileNameMatchers([{ firstName: "Jean", lastName: "Dupont" }]);
    expect(hookPattern("🔥 KO DE DUPONT AU R1 !", matchers)).toBe("{E} ko de {NOM} au {N}");
    expect(hookPattern("🏆 HEXAGONE MMA 12 : quelle soirée à Paris ce soir", matchers)).toBe(
      "{E} {EVENT} quelle soiree a",
    );
  });

  it("calcule les empreintes de structure, globales et par catégorie", () => {
    expect(profile.structures.filter((s) => !s.categoryId)).toEqual([
      { fingerprint: "H-B-C-T", count: 12 },
      { fingerprint: "H-B-T", count: 8 },
    ]);
    expect(profile.structures).toContainEqual({
      fingerprint: "H-B-C-T",
      count: 7,
      categoryId: "live_ko",
    });
  });

  it("reconnaît information, citation et signature", async () => {
    const { signatures } = await buildSeedData();
    expect(
      structureFingerprint("🎤 Réaction\n\n« Je reviendrai plus fort. »\n\n#HexagoneMMA"),
    ).toBe("H-Q-T");
    expect(
      structureFingerprint("📢 Annonce\n\n🗓️ Samedi 14 mars à 20h30\n\nCorps du texte.\n\n#MMA"),
    ).toBe("H-I-B-T");
    // « en direct » fait partie du lexique CTA (section 8.7) : en fin de post, c'est un CTA.
    expect(
      structureFingerprint("📢 Annonce\n\nCorps du texte.\n📺 En direct sur DAZN à 20h30\n\n#MMA"),
    ).toBe("H-B-C-T");
    const withSignature =
      "📢 Annonce\n\nCorps.\n\n🗓️ Samedi 14 mars - Salle Test, Paris\n🎫 Prenez vos places dès maintenant !\n(Lien en bio du profil)";
    expect(structureFingerprint(withSignature, { signatures })).toBe("H-B-S");
  });
});

describe("longueur et ponctuation", () => {
  it("mesure la longueur en caractères visibles", () => {
    expect(profile.length.charsMedian).toBeGreaterThan(BODY_A.length);
    expect(profile.length.charsP90).toBeGreaterThanOrEqual(profile.length.charsMedian);
    expect(profile.length.linesMedian).toBe(4);
    expect(profile.length.paragraphsMedian).toBe(4);
    expect(profile.punctuation.exclamationPerPost).toBe(0.6);
  });
});

describe("corpus insuffisant", () => {
  it("3 publications : confiance insuffisante et aucune expression à varier", () => {
    const three = library.filter((w) => ["ko-0", "ko-1", "ko-2"].includes(w.id));
    const small = buildStyleProfile({ mode: "live", wordings: three, fighters: CORPUS_FIGHTERS });
    expect(small.corpusSize).toBe(3);
    expect(small.confidence).toBe("insufficient");
    expect(small.overused).toEqual([]);
  });

  it("corpus vide : un profil cohérent, sans erreur", () => {
    const empty = buildStyleProfile({ mode: "daily", wordings: [] });
    expect(empty.corpusSize).toBe(0);
    expect(empty.length.charsMedian).toBe(0);
    expect(empty.hashtags.position).toBe("end");
  });
});

describe("collapseExpressions", () => {
  it("garde la plus longue des expressions imbriquées et un seul maillon par chaîne", () => {
    const items = [
      { text: "trois rounds", share: 0.4 },
      { text: "trois rounds intenses", share: 0.4 },
      { text: "rounds intenses", share: 0.4 },
      { text: "salle a vibre", share: 0.3 },
      { text: "a vibre du debut", share: 0.3 },
      { text: "lien en bio", share: 0.5 },
    ];
    expect(collapseExpressions(items).map((i) => i.text)).toEqual([
      "lien en bio",
      "trois rounds intenses",
      "a vibre du debut", // à fréquence égale, la plus longue représente la chaîne
    ]);
  });
});
