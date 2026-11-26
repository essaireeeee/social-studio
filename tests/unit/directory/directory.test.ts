import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCategory } from "@/lib/categories/registry";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import { createWording } from "@/lib/database/wording-factory";
import { deleteEvent, saveEvent } from "@/lib/events/actions";
import {
  addFightWith,
  cardErrors,
  fightersOnCard,
  moveFight,
  newFight,
  placeFighter,
} from "@/lib/events/fight-card";
import { eventForm, eventFormErrors, newBroadcaster, scheduleWarning } from "@/lib/events/form";
import { eventTimeline, nextEvent } from "@/lib/events/query";
import { deleteFighter, FighterInUseError, saveFighter } from "@/lib/fighters/actions";
import { fighterForm, fighterFormErrors, fighterFromForm, newFightRow } from "@/lib/fighters/form";
import {
  distinctValues,
  fighterEvents,
  fighterWordings,
  filterFighters,
} from "@/lib/fighters/query";
import { buildBriefContext } from "@/lib/generation/native/context";
import { moveGroup, saveGroup, saveSignature } from "@/lib/hashtags/actions";
import {
  groupForm,
  groupFormErrors,
  normalizeHashtag,
  parseHashtagList,
  reorder,
} from "@/lib/hashtags/groups";
import {
  previewSignature,
  signatureForm,
  signatureFormErrors,
  templateVariables,
} from "@/lib/hashtags/signatures";
import { selectCategory, setEventField, emptyDraft } from "@/lib/studio/draft";
import type { Brief, Fighter, HexEvent } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

const now = fixedNow();

const fighter = (id: string, firstName: string, lastName: string, extra: Partial<Fighter> = {}) =>
  ({
    id,
    firstName,
    lastName,
    fightHistory: [],
    updatedAt: now.toISOString(),
    ...extra,
  }) as Fighter;

const EVENT: HexEvent = {
  id: "ev13",
  name: "HEXAGONE MMA",
  number: 13,
  date: "2026-12-12",
  city: "Besançon",
  venue: "Micropolis",
  ticketingUrl: "https://billetterie.example/hex13",
  links: [],
  broadcasters: [
    { name: "Chaîne Test", channel: "Chaîne Test", startTime: "19h00", scope: "prelims" },
    { name: "Chaîne Test", channel: "Chaîne Test Max", startTime: "21h00", scope: "main_card" },
  ],
  confirmedSchedule: false,
  milestones: [],
  fightCard: [],
  updatedAt: now.toISOString(),
};

describe("fiche combattant", () => {
  it("palmarès daté obligatoire, historique contrôlé", () => {
    const values = { ...fighterForm(), lastName: "Fictif", wins: "10", losses: "2", draws: "x" };
    expect(fighterFormErrors(values)).toMatchObject({
      draws: "Nombre entier attendu.",
      recordAsOf: "Indiquez à quelle date ce palmarès est exact.",
    });
    const history = { ...fighterForm(), lastName: "Fictif", fightHistory: [newFightRow()] };
    expect(Object.keys(fighterFormErrors(history))).toEqual(["fight-0-date", "fight-0-opponent"]);
    expect(fighterFormErrors({ ...fighterForm(), lastName: " " })).toEqual({
      lastName: "Le nom est requis.",
    });
  });

  it("conversion : champs vides retirés, historique trié, date de mise à jour", () => {
    const saved = fighterFromForm(
      {
        ...fighterForm(),
        firstName: " Karim ",
        lastName: "Fictif",
        wins: "10",
        losses: "2",
        draws: "0",
        recordAsOf: "2026-11-01",
        fightHistory: [
          newFightRow({ date: "2025-01-10", opponent: "A", result: "W" }),
          newFightRow({ date: "2026-03-14", opponent: "B", result: "L", eventId: "ev12" }),
        ],
      },
      { id: "f1", now },
    );
    expect(saved).toMatchObject({
      firstName: "Karim",
      nickname: undefined,
      record: { wins: 10, losses: 2, draws: 0, asOf: "2026-11-01" },
      updatedAt: now.toISOString(),
    });
    expect(saved.fightHistory.map((f) => f.opponent)).toEqual(["B", "A"]);
    expect(fighterForm(saved).recordAsOf).toBe("2026-11-01");
  });

  it("filtres, valeurs distinctes, publications et événements liés", async () => {
    const list = [
      fighter("a", "Karim", "Fictif", { weightClass: "Légers", club: "Team Nord" }),
      fighter("b", "Ana", "Exemple", { weightClass: "Mouches", nickname: "L'Éclair" }),
    ];
    expect(filterFighters(list, { text: "eclair" }).map((f) => f.id)).toEqual(["b"]);
    expect(filterFighters(list, { club: "Team Nord" }).map((f) => f.id)).toEqual(["a"]);
    expect(filterFighters(list, {}).map((f) => f.id)).toEqual(["b", "a"]);
    expect(distinctValues(list, "weightClass")).toEqual(["Légers", "Mouches"]);

    const w = await createWording({
      text: "KO de Karim",
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      source: "manual",
      fighterIds: ["a"],
    });
    expect(fighterWordings([w], "a")).toHaveLength(1);
    const withCard = {
      ...EVENT,
      fightCard: [{ fighterAId: "a", fighterBId: "b", position: "main" as const }],
    };
    expect(fighterEvents([withCard], list[0]!)).toEqual([{ event: withCard, onCard: true }]);
  });
});

describe("fight card", () => {
  it("glisser-déposer : un combattant ne figure que dans un combat", () => {
    let card = addFightWith([], "a");
    card = placeFighter(card, card[0]!.key, "B", "b");
    card = addFightWith(card, "c");
    expect(fightersOnCard(card)).toEqual(new Set(["a", "b", "c"]));
    // « b » déplacé dans le second combat : son premier coin se vide.
    card = placeFighter(card, card[1]!.key, "B", "b");
    expect(card.map((f) => [f.fighterAId, f.fighterBId])).toEqual([
      ["a", ""],
      ["c", "b"],
    ]);
    expect(Object.values(cardErrors(card))).toEqual([
      "Combat incomplet : choisissez deux combattants.",
    ]);
    expect(moveFight(card, 1, 0).map((f) => f.fighterAId)).toEqual(["c", "a"]);
    expect(moveFight(card, 0, 5)).toEqual(card);
    expect(newFight().position).toBe("card");
  });
});

describe("fiche événement", () => {
  it("contrôles : lien, horaire, diffuseur, avertissement sans horaire", () => {
    const values = {
      ...eventForm(),
      ticketingUrl: "billetterie",
      broadcasters: [newBroadcaster({ name: "", startTime: "vingt heures" })],
      confirmedSchedule: true,
    };
    const errors = eventFormErrors(values);
    expect(errors.ticketingUrl).toBeDefined();
    expect(Object.values(errors)).toContain("Nom du diffuseur requis.");
    expect(Object.values(errors)).toContain("Horaire attendu au format 20h30.");
    expect(scheduleWarning(values)).toBeUndefined();
    expect(
      scheduleWarning({ ...values, broadcasters: [newBroadcaster({ name: "Chaîne Test" })] }),
    ).toBe("Horaires confirmés, mais aucun horaire n'est saisi pour les diffuseurs.");
    expect(eventForm().name).toBe("HEXAGONE MMA");
  });

  it("chronologie : à venir (sans date à la fin), passés du plus récent au plus ancien", () => {
    const e = (id: string, date?: string) => ({ ...EVENT, id, date });
    const timeline = eventTimeline(
      [
        e("old", "2025-05-01"),
        e("soon", "2026-12-12"),
        e("tbd"),
        e("later", "2027-03-01"),
        e("recent", "2026-10-01"),
      ],
      "2026-11-20",
    );
    expect(timeline.upcoming.map((x) => x.id)).toEqual(["soon", "later", "tbd"]);
    expect(timeline.past.map((x) => x.id)).toEqual(["recent", "old"]);
    expect(nextEvent([e("tbd"), e("soon", "2026-12-12")], "2026-11-20")?.id).toBe("soon");
  });
});

describe("hashtags et signatures", () => {
  it("normalisation à la saisie : # ajouté, espaces retirés", () => {
    expect(normalizeHashtag("hexagone mma")).toBe("#hexagonemma");
    expect(normalizeHashtag("##MMA")).toBe("#MMA");
    expect(normalizeHashtag("#MMA!")).toBeNull();
    expect(parseHashtagList("Hexagone MMA, #mma\n#MMA ; Besançon 2026")).toEqual({
      tags: ["#HexagoneMMA", "#mma", "#Besançon2026"],
      invalid: [],
    });
    expect(groupFormErrors({ ...groupForm(), name: "X", tagsText: "a-b" }).tags).toBe(
      "Hashtag invalide : a-b.",
    );
    expect(groupFormErrors({ ...groupForm(), modes: [] }).modes).toBeDefined();
  });

  it("réordonner renumérote l'ordre", () => {
    const items = [
      { id: "a", order: 0 },
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ];
    expect(reorder(items, 2, 0)).toEqual([
      { id: "c", order: 0 },
      { id: "a", order: 1 },
      { id: "b", order: 2 },
    ]);
  });

  it("signature : variables connues seulement, ligne vide supprimée, horaires si confirmés", () => {
    expect(templateVariables("{date} {venue} {date}")).toEqual(["date", "venue"]);
    expect(
      signatureFormErrors({ ...signatureForm(), name: "S", template: "{date} {heure}" }).template,
    ).toBe("Variable inconnue : {heure}.");

    const values = {
      template: "🗓️ {date} - {venue}, {city}\n📺 {broadcaster} à {mainTime}\n🎫 {ticketLink}",
      requiredFields: ["date" as const],
      requiresConfirmedSchedule: false,
    };
    const unconfirmed = previewSignature(values, EVENT);
    expect(unconfirmed.text).toBe(
      "🗓️ samedi 12 décembre - Micropolis, Besançon\n🎫 https://billetterie.example/hex13",
    );
    const confirmed = previewSignature(values, { ...EVENT, confirmedSchedule: true });
    expect(confirmed.text).toContain("📺 Chaîne Test à 21h00");
    const empty = previewSignature(values, undefined);
    expect(empty.text).toBeUndefined();
    expect(empty.missing).toEqual(["date"]);
  });
});

describe("Studio : événement choisi dans le brief", () => {
  it("date, salle, ville et billetterie pré-remplies ; saisie du CM préservée", () => {
    let draft = selectCategory(emptyDraft(), "daily_event_announce");
    draft = setEventField(draft, "HEXAGONE MMA 13", [EVENT]);
    expect(draft.fields).toMatchObject({
      event: "HEXAGONE MMA 13",
      date: "2026-12-12",
      venue: "Micropolis",
      city: "Besançon",
    });
    // Saisie manuelle conservée, valeurs automatiques retirées avec l'événement.
    draft = { ...draft, fields: { ...draft.fields, venue: "Salle choisie" } };
    draft = setEventField(draft, "", [EVENT]);
    expect(draft.fields.venue).toBe("Salle choisie");
    expect(draft.fields.date).toBeUndefined();
    expect(draft.fields.city).toBeUndefined();

    const ticketing = setEventField(selectCategory(emptyDraft(), "daily_ticketing"), "ev13", [
      EVENT,
    ]);
    expect(ticketing.fields.ticketLink).toBe("https://billetterie.example/hex13");
    // Nom libre sans fiche : rien n'est inventé.
    expect(
      setEventField(selectCategory(emptyDraft(), "daily_event_announce"), "Gala X", [EVENT]).fields,
    ).toEqual({ event: "Gala X" });
  });

  it("catégorie choisie après l'événement : champs remplis aussi", () => {
    const draft = selectCategory(
      { ...emptyDraft(), fields: { event: "HEXAGONE MMA 13" } },
      "daily_event_announce",
      null,
      [EVENT],
    );
    expect(draft.fields).toMatchObject({ city: "Besançon", venue: "Micropolis" });
  });

  it("palmarès : seulement si « Utiliser le palmarès », formulation datée en interne", () => {
    const karim = fighter("f1", "Karim", "Fictif", {
      record: { wins: 10, losses: 2, draws: 0, asOf: "2026-11-01" },
    });
    const brief = (useRecord?: boolean): Brief => ({
      mode: "daily",
      categoryId: "daily_fighter_intro",
      platform: "instagram",
      fields: { fighter: "Karim Fictif", ...(useRecord ? { useRecord: true } : {}) },
      hashtagIds: [],
    });
    const category = getCategory("daily_fighter_intro")!;
    expect(category.optional).toContain("useRecord");
    const without = buildBriefContext(brief(), category, { fighters: [karim], hashtags: [] });
    expect(without.vars.fighterRecord).toBeUndefined();
    const withRecord = buildBriefContext(brief(true), category, {
      fighters: [karim],
      hashtags: [],
    });
    expect(withRecord.vars.fighterRecord).toBe("10-2-0");
    expect(withRecord.facts).toContain("Palmarès de Karim Fictif au 01/11/2026 : 10-2-0");
  });
});

describe("écritures", () => {
  let repository: DexieRepository;
  beforeEach(async () => {
    repository = createTestRepository();
    await runSeed(repository, now);
  });
  afterEach(async () => {
    await disposeRepository(repository);
  });

  it("combattant sur une fight card : suppression refusée ; sinon liens retirés", async () => {
    const a = await saveFighter(repository, {
      ...fighterForm(),
      firstName: "Karim",
      lastName: "Fictif",
    });
    const b = await saveFighter(repository, {
      ...fighterForm(),
      firstName: "Tom",
      lastName: "Essai",
    });
    const values = eventForm();
    values.fightCard = [newFight({ fighterAId: a.id, fighterBId: b.id, position: "main" })];
    const event = await saveEvent(repository, { ...values, number: "13" });
    await expect(deleteFighter(repository, a)).rejects.toBeInstanceOf(FighterInUseError);

    const w = await createWording({
      text: "Karim et Tom",
      mode: "daily",
      categoryId: "comm_news",
      platform: "instagram",
      source: "manual",
      fighterIds: [a.id],
      eventId: event.id,
    });
    await repository.wordings.put(w);
    await deleteEvent(repository, event);
    expect((await repository.wordings.get(w.id))!.eventId).toBeUndefined();
    await deleteFighter(repository, a);
    expect((await repository.wordings.get(w.id))!.fighterIds).toEqual([]);
    expect(await repository.fighters.get(a.id)).toBeUndefined();
  });

  it("groupes et signatures : ajout en fin de liste, réordonnancement enregistré", async () => {
    const group = await saveGroup(repository, {
      ...groupForm(),
      name: "Campagne hiver",
      tagsText: "Hexagone Hiver",
    });
    expect(group).toMatchObject({ order: 2, tags: ["#HexagoneHiver"] });
    await moveGroup(repository, await repository.hashtagGroups.list(), 2, 0);
    const ordered = (await repository.hashtagGroups.list()).sort((x, y) => x.order - y.order);
    expect(ordered[0]!.id).toBe(group.id);

    const signature = await saveSignature(repository, {
      ...signatureForm(),
      name: "Billetterie",
      template: "🎫 {ticketLink}",
      requiredFields: ["ticketLink"],
    });
    expect(signature.order).toBe(2);
  });
});
