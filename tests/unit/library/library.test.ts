import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import { createClassifier } from "@/lib/import/classifier";
import {
  checkDuplicate,
  dedupeItems,
  deleteWording,
  saveWording,
  toggleReference,
  ReferenceToggleError,
} from "@/lib/library/actions";
import {
  emptyForm,
  formErrors,
  formFromGeneration,
  formFromWording,
  inputFromForm,
  parseHashtags,
  withCategory,
  withMode,
  withText,
} from "@/lib/library/form";
import { gridColumns, visibleRange } from "@/lib/library/virtual";
import type { Fighter, Generation, HexEvent } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

const classify = createClassifier();

describe("fiche publication", () => {
  it("le texte suffit : catégorie proposée, hashtags et CTA extraits", () => {
    const values = withText(
      emptyForm("daily"),
      "🎟️ Billetterie ouverte pour la prochaine soirée.\n\nPrenez vos places dès maintenant !\n\n#HexagoneMMA #MMA",
      classify,
    );
    expect(values).toMatchObject({
      mode: "daily",
      categoryId: "daily_ticketing",
      hashtags: "#HexagoneMMA #MMA",
    });
    expect(values.confidence).toBeGreaterThanOrEqual(0.4);
    expect(values.cta).not.toBe("");
    expect(formErrors(values, [])).toEqual({});
  });

  it("un choix manuel n'est plus écrasé par les propositions", () => {
    let values = withText(emptyForm("live"), "💥 KO au premier round !", classify);
    expect(values.categoryId).toBe("live_ko");
    values = withCategory(values, "live_reaction");
    values = { ...values, hashtags: "#Perso", hashtagsTouched: true };
    values = withText(values, "💥 KO au premier round ! #Autre", classify);
    expect(values).toMatchObject({ categoryId: "live_reaction", hashtags: "#Perso" });
  });

  it("changer de mode retire une catégorie de l'autre mode", () => {
    const live = withText(emptyForm("live"), "💥 KO au premier round !", classify);
    const daily = withMode(live, "daily");
    expect(daily).toMatchObject({ mode: "daily", categoryId: "" });
    // Mode imposé : une proposition de l'autre mode est ignorée.
    expect(withText(daily, "💥 KO au premier round !", classify).categoryId).toBe("");
  });

  it("erreurs : texte, catégorie à choisir, combattant sans fiche, lien", () => {
    expect(formErrors(emptyForm("live"), [])).toMatchObject({ text: "Le texte est requis." });
    const unknown = withText(emptyForm("daily"), "Bonne journée à tous.", classify);
    expect(formErrors(unknown, []).categoryId).toBe("À catégoriser : choisissez une catégorie.");
    const bad = { ...withCategory(unknown, "comm_news"), fighters: ["Inconnu"], instagramUrl: "x" };
    expect(formErrors(bad, [])).toMatchObject({
      fighters: expect.stringContaining("Inconnu"),
      instagramUrl: expect.any(String),
    });
  });

  it("hashtags normalisés, données à enregistrer", () => {
    expect(parseHashtags("HexagoneMMA, #MMA #MMA")).toEqual(["#HexagoneMMA", "#MMA"]);
    const fighters = [{ id: "f1", firstName: "Karim", lastName: "Fictif" }] as Fighter[];
    const values = {
      ...withCategory(emptyForm("live"), "live_ko"),
      text: "  KO !  ",
      fighters: ["Karim Fictif"],
      tags: "soirée, soirée, finale",
    };
    expect(inputFromForm(values, fighters)).toMatchObject({
      text: "KO !",
      fighterIds: ["f1"],
      tags: ["soirée", "finale"],
      eventId: undefined,
      status: "published",
    });
  });
});

describe("fiche pré-remplie depuis le Studio", () => {
  it("brief repris : catégorie, combattants ayant une fiche, événement, statut validé", () => {
    const fighters = [{ id: "f1", firstName: "Karim", lastName: "Fictif" }] as Fighter[];
    const events = [{ id: "e12", name: "HEXAGONE MMA", number: 12 }] as HexEvent[];
    const generation = {
      brief: {
        mode: "live",
        categoryId: "live_ko",
        platform: "facebook",
        fields: { winner: "karim fictif", loser: "Inconnu Libre", event: "HEXAGONE MMA 12" },
        hashtagIds: [],
      },
    } as unknown as Generation;
    const values = formFromGeneration(generation, "💥 KO !\n\n#HexagoneMMA", { fighters, events });
    expect(values).toMatchObject({
      mode: "live",
      categoryId: "live_ko",
      platform: "facebook",
      fighters: ["Karim Fictif"],
      eventId: "e12",
      hashtags: "#HexagoneMMA",
      status: "validated",
    });
    expect(formErrors(values, fighters)).toEqual({});
  });
});

describe("écritures de la bibliothèque", () => {
  let repository: DexieRepository;
  beforeEach(async () => {
    repository = createTestRepository();
    await runSeed(repository, fixedNow());
  });
  afterEach(async () => {
    await disposeRepository(repository);
  });

  it("ajout manuel, doublon détecté avant enregistrement, modification", async () => {
    const values = withText(
      emptyForm("live"),
      "💥 KO de Karim Fictif au premier round !",
      classify,
    );
    const created = await saveWording(repository, values, { fighters: [], now: fixedNow() });
    expect(created).toMatchObject({ source: "manual", status: "published", isReference: true });

    const library = dedupeItems(await repository.wordings.list());
    expect(await checkDuplicate(values.text, library)).toMatchObject({
      kind: "exact",
      of: created.id,
    });
    expect(await checkDuplicate(values.text, library, created.id)).toEqual({ kind: "new" });

    const edited = await saveWording(
      repository,
      { ...formFromWording(created, []), text: "💥 KO de Karim Fictif dès le premier round !" },
      { fighters: [], existing: created, now: new Date("2026-12-01T00:00:00.000Z") },
    );
    expect(edited).toMatchObject({
      id: created.id,
      createdAt: created.createdAt,
      source: "manual",
    });
    expect(edited.updatedAt).toBe("2026-12-01T00:00:00.000Z");
  });

  it("référence de style : bascule, interdite pour un exemple fictif", async () => {
    const demo = (await repository.wordings.list()).find((w) => w.isDemo)!;
    await expect(toggleReference(repository, demo)).rejects.toBeInstanceOf(ReferenceToggleError);
    const values = withText(emptyForm("live"), "🐍 Soumission au deuxième round", classify);
    const real = await saveWording(repository, values, { fighters: [] });
    expect((await toggleReference(repository, real)).isReference).toBe(false);
    await deleteWording(repository, real.id);
    expect(await repository.wordings.get(real.id)).toBeUndefined();
  });
});

describe("liste virtuelle", () => {
  it("seules les lignes visibles et la marge sont rendues", () => {
    expect(visibleRange(0, 600, 60, 5000, 5)).toEqual({ start: 0, end: 15 });
    expect(visibleRange(60_000, 600, 60, 5000, 5)).toEqual({ start: 995, end: 1015 });
    expect(visibleRange(-300, 600, 60, 5000, 0)).toEqual({ start: 0, end: 5 });
    expect(visibleRange(299_000, 900, 60, 5000)).toEqual({ start: 4977, end: 5000 });
    expect(visibleRange(0, 600, 60, 0)).toEqual({ start: 0, end: 0 });
  });

  it("colonnes de la grille selon la largeur", () => {
    expect(gridColumns(360)).toBe(1);
    expect(gridColumns(700)).toBe(2);
    expect(gridColumns(1000)).toBe(3);
    expect(gridColumns(3000)).toBe(4);
  });
});
