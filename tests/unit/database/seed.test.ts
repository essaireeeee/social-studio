import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { DEMO_BADGE, SEED_VERSION, buildSeedData, runSeed } from "@/lib/database/seed";
import { DEFAULT_USER_ID } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

let repository: DexieRepository;

beforeEach(() => {
  repository = createTestRepository();
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("seed", () => {
  it("s'exécute une seule fois", async () => {
    expect(await runSeed(repository, fixedNow())).toEqual({ ran: true, seedVersion: SEED_VERSION });
    expect(await runSeed(repository, fixedNow())).toEqual({
      ran: false,
      seedVersion: SEED_VERSION,
    });
    expect(await repository.wordings.count()).toBe(6);
    expect(await repository.getMeta("seedVersion")).toBe(SEED_VERSION);
  });

  it("ne crée pas de doublon si deux onglets lancent le seed en même temps", async () => {
    await Promise.all([runSeed(repository, fixedNow()), runSeed(repository, fixedNow())]);
    expect(await repository.wordings.count()).toBe(6);
    expect(await repository.users.count()).toBe(1);
  });

  it("crée six démos : 3 LIVE, 3 DAILY, toutes fictives et exclues des références", async () => {
    await runSeed(repository, fixedNow());
    const wordings = await repository.wordings.list();
    expect(wordings.filter((w) => w.mode === "live")).toHaveLength(3);
    expect(wordings.filter((w) => w.mode === "daily")).toHaveLength(3);
    for (const wording of wordings) {
      expect(wording).toMatchObject({ isDemo: true, isReference: false, source: "demo" });
      expect(wording.fighterIds).toEqual([]);
      expect(wording.date).toBeUndefined();
    }
    expect(new Set(wordings.map((w) => w.categoryId))).toEqual(
      new Set([
        "live_ko",
        "live_champion",
        "live_reaction",
        "daily_fight_announce",
        "media_press",
        "daily_ticketing",
      ]),
    );
    expect(DEMO_BADGE).toBe("EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE");
  });

  it("les démos respectent la règle « de HEXAGONE MMA »", async () => {
    const { wordings } = await buildSeedData(fixedNow());
    for (const { text } of wordings) {
      const misuses = [...text.matchAll(/(\S+\s+)?d['’]HEXAGONE MMA/g)].filter(
        (match) => !/^(ceinture|titre)\s+$/.test(match[1] ?? ""),
      );
      expect(misuses).toEqual([]);
    }
    expect(wordings.some((w) => w.text.includes("la ceinture d'HEXAGONE MMA"))).toBe(true);
  });

  it("n'active par défaut que le hashtag officiel", async () => {
    await runSeed(repository, fixedNow());
    const groups = await repository.hashtagGroups.list();
    expect(groups.filter((g) => g.defaultOn).map((g) => g.tags)).toEqual([["#HexagoneMMA"]]);
    expect(groups.find((g) => g.kind === "mma_france")?.tags).toEqual([
      "#MMAFrance",
      "#MMA",
      "#CombatSports",
    ]);
  });

  it("crée les deux signatures avec leurs gabarits et conditions", async () => {
    await runSeed(repository, fixedNow());
    const event = await repository.signatures.get("signature-event");
    expect(event?.template).toBe(
      "🗓️ {date} - {venue}, {city}\n📺 En direct sur {broadcaster}\n🎫 Prenez vos places dès maintenant !\n(Lien en bio du profil)",
    );
    expect(event?.requiredFields).toEqual(["date", "venue", "city"]);

    const broadcast = await repository.signatures.get("signature-broadcast");
    expect(broadcast?.requiresConfirmedSchedule).toBe(true);
    expect(broadcast?.requiredFields).toEqual([
      "prelimsTime",
      "prelimsChannel",
      "mainTime",
      "mainChannel",
    ]);
  });

  it("crée la fiche Samba Sima avec son nom et la règle, sans aucune donnée inventée", async () => {
    await runSeed(repository, fixedNow());
    const fighter = await repository.fighters.get("fighter-samba-sima");
    expect(fighter).toBeDefined();
    expect(Object.keys(fighter!).sort()).toEqual(
      ["editorialNotes", "fightHistory", "firstName", "id", "lastName", "updatedAt"].sort(),
    );
    expect(fighter).toMatchObject({ firstName: "Samba", lastName: "Sima", fightHistory: [] });
    expect(fighter?.editorialNotes).toMatch(/crack/);
  });

  it("crée l'utilisateur administrateur, les règles et les réglages par défaut", async () => {
    await runSeed(repository, fixedNow());
    expect(await repository.users.get(DEFAULT_USER_ID)).toEqual({
      id: DEFAULT_USER_ID,
      name: "Community Manager",
      role: "admin",
    });
    const ruleIds = (await repository.rules.list()).map((rule) => rule.id);
    expect(ruleIds).toEqual(
      expect.arrayContaining(["rule-de-hexagone", "rule-ceinture-titre", "rule-samba-sima"]),
    );
    const settings = await repository.getSettings();
    expect(settings.quickOptions).toEqual({
      rounds: ["R1", "R2", "R3", "R4", "R5"],
      methods: ["KO", "TKO", "Soumission", "Décision"],
      broadcasters: ["RMC SPORT", "DAZN", "YouTube", "Autre", "Aucun"],
    });
    expect(settings.activeUserId).toBe(DEFAULT_USER_ID);
  });

  it("les motifs des règles de remplacement sont des expressions valides", async () => {
    const { rules } = await buildSeedData(fixedNow());
    for (const rule of rules.filter((r) => r.pattern)) {
      expect(() => new RegExp(rule.pattern!, rule.flags)).not.toThrow();
    }
    const deRule = rules.find((r) => r.id === "rule-de-hexagone")!;
    expect(
      "la victoire d'HEXAGONE MMA".replace(
        new RegExp(deRule.pattern!, deRule.flags),
        deRule.replacement!,
      ),
    ).toBe("la victoire de HEXAGONE MMA");
  });

  it("étape 2 : met à jour les règles intégrées d'une base v1 sans toucher au reste", async () => {
    await runSeed(repository, fixedNow());
    // État v1 simulé : ancien motif, règle désactivée par l'admin, une démo supprimée.
    await repository.rules.put({
      ...(await repository.rules.get("rule-de-hexagone"))!,
      pattern: "\\bd['’]HEXAGONE MMA\\b",
      enabled: false,
    });
    await repository.wordings.delete("demo-live-ko");
    await repository.setMeta("seedVersion", 1);

    expect(await runSeed(repository, fixedNow())).toEqual({ ran: true, seedVersion: SEED_VERSION });
    const rule = await repository.rules.get("rule-de-hexagone");
    expect(rule?.pattern).toContain("ceintures?|titres?");
    expect(rule?.enabled).toBe(false);
    expect(await repository.wordings.get("demo-live-ko")).toBeUndefined();
    expect(await repository.wordings.count()).toBe(5);
  });
});
