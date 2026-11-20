import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import {
  ProfileValidationError,
  activeProfile,
  computeProfile,
  diffProfiles,
  listProfiles,
  pendingProfile,
  recomputeAfterImport,
  styleParameters,
  validateProfile,
} from "@/lib/editorial/profile-service";
import { DEFAULT_STYLE_BY_MODE } from "@/lib/editorial/rules";
import type { UserProfile } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";
import { CORPUS_FIGHTERS, buildStyleCorpus } from "../../fixtures/style-corpus";

const admin: UserProfile = { id: "user-default", name: "Community Manager", role: "admin" };
const cm: UserProfile = { id: "user-cm", name: "CM", role: "cm" };
const at = (minutes: number) => new Date(fixedNow().getTime() + minutes * 60_000);

let repository: DexieRepository;

beforeEach(async () => {
  repository = createTestRepository();
  await runSeed(repository, fixedNow());
  await repository.fighters.bulkPut(CORPUS_FIGHTERS);
  await repository.wordings.bulkPut(await buildStyleCorpus());
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("calcul et cycle de vie", () => {
  it("calcule un profil proposé à partir de la base, noms connus compris", async () => {
    const profile = await computeProfile(repository, "live", { now: at(1) });
    expect(profile).toMatchObject({ mode: "live", status: "proposed", corpusSize: 20 });
    expect(profile.hooks.patterns[0]?.pattern).toBe("{E} ko de {NOM} au {N}");
    expect(await repository.styleProfiles.get(profile.id)).toEqual(profile);
  });

  it("utilise le lexique CTA de la base : désactivé, seuls les impératifs restent", async () => {
    const rule = (await repository.rules.get("rule-cta-lexicon"))!;
    await repository.rules.put({ ...rule, enabled: false });
    const profile = await computeProfile(repository, "live", { now: at(1) });
    const texts = profile.ctas.top.filter((c) => !c.categoryId).map((c) => c.text);
    expect(texts).toEqual(["Rendez-vous samedi prochain."]); // « Rendez-vous » est un impératif
  });

  it("un profil proposé n'alimente pas les moteurs avant validation", async () => {
    const proposed = await computeProfile(repository, "live", { now: at(1) });
    const profiles = await listProfiles(repository, "live");
    expect(activeProfile(profiles)).toBeUndefined();
    expect(pendingProfile(profiles)?.id).toBe(proposed.id);
    expect(styleParameters(activeProfile(profiles), "live").source).toBe("defaults");
  });

  it("validation réservée à l'administrateur, refusée pour un profil avec démos", async () => {
    const proposed = await computeProfile(repository, "live", { now: at(1) });
    await expect(validateProfile(repository, cm, proposed.id)).rejects.toThrow(/administrateur/);

    const withDemo = await computeProfile(repository, "live", { includeDemo: true, now: at(2) });
    expect(withDemo.includesDemo).toBe(true);
    await expect(validateProfile(repository, admin, withDemo.id)).rejects.toBeInstanceOf(
      ProfileValidationError,
    );

    const validated = await validateProfile(repository, admin, proposed.id, at(3));
    expect(validated).toMatchObject({ status: "validated", validatedBy: admin.id });
    const profiles = await listProfiles(repository, "live");
    expect(activeProfile(profiles)?.id).toBe(proposed.id);
    // La proposition avec démos est antérieure à la validation : plus en attente.
    expect(pendingProfile(profiles)).toBeUndefined();
  });

  it("un nouveau calcul après validation redevient une proposition à comparer", async () => {
    const first = await computeProfile(repository, "live", { now: at(1) });
    await validateProfile(repository, admin, first.id, at(2));
    const second = await computeProfile(repository, "live", { now: at(3) });
    const profiles = await listProfiles(repository, "live");
    expect(activeProfile(profiles)?.id).toBe(first.id);
    expect(pendingProfile(profiles)?.id).toBe(second.id);
  });

  it("ne garde que les 5 dernières propositions par mode", async () => {
    for (let i = 0; i < 7; i += 1) await computeProfile(repository, "live", { now: at(i) });
    expect((await listProfiles(repository, "live")).length).toBe(5);
  });
});

describe("recalcul automatique après import", () => {
  it("se déclenche au-delà de 10 publications, pour les modes concernés", async () => {
    const live = Array.from({ length: 11 }, () => ({ mode: "live" as const }));
    expect(await recomputeAfterImport(repository, live.slice(0, 10))).toEqual([]);
    const profiles = await recomputeAfterImport(repository, [...live, { mode: "daily" }], at(5));
    expect(profiles.map((p) => p.mode).sort()).toEqual(["daily", "live"]);
  });
});

describe("paramètres de style pour les moteurs", () => {
  it("valeurs par défaut documentées si le profil est absent ou insuffisant", async () => {
    expect(styleParameters(undefined, "daily")).toEqual({
      source: "defaults",
      corpusSize: 0,
      ...DEFAULT_STYLE_BY_MODE.daily,
    });
    const daily = await computeProfile(repository, "daily", { now: at(1) });
    const validated = await validateProfile(repository, admin, daily.id, at(2));
    expect(validated.confidence).toBe("insufficient");
    expect(styleParameters(validated, "daily").source).toBe("defaults");
  });

  it("mesures du profil validé sinon, seuil d'emojis = p90 arrondi au-dessus", async () => {
    const live = await validateProfile(
      repository,
      admin,
      (await computeProfile(repository, "live", { now: at(1) })).id,
      at(2),
    );
    expect(styleParameters(live, "live")).toMatchObject({
      source: "profile",
      corpusSize: 20,
      emojiThreshold: 2,
      hashtagPosition: "end",
    });
  });
});

describe("comparaison", () => {
  it("liste les indicateurs avant / après et marque ceux qui changent", async () => {
    const first = await computeProfile(repository, "live", { now: at(1) });
    await repository.wordings.delete("ko-0");
    const second = await computeProfile(repository, "live", { now: at(2) });
    const rows = diffProfiles(first, second);
    const corpus = rows.find((r) => r.key === "corpusSize")!;
    expect(corpus).toEqual({
      key: "corpusSize",
      label: "Publications analysées",
      before: "20",
      after: "19",
      changed: true,
    });
    expect(rows.find((r) => r.key === "topEmoji")?.changed).toBe(false);
    expect(diffProfiles(undefined, second).every((r) => r.before === "-" && !r.changed)).toBe(true);
  });
});
