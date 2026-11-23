import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import {
  activeSession,
  endLiveSession,
  inputFromEvent,
  sessionSummary,
  startLiveSession,
  updateLiveSession,
  validateSessionInput,
} from "@/lib/shell/live-session";
import type { HexEvent } from "@/types/domain";
import { createTestRepository, disposeRepository } from "../../fixtures/entities";

let repository: DexieRepository;
beforeEach(() => {
  repository = createTestRepository();
});
afterEach(async () => {
  await disposeRepository(repository);
});

const event: HexEvent = {
  id: "event-12",
  name: "HEXAGONE MMA",
  number: 12,
  date: "2026-03-14",
  venue: "Salle Test",
  city: "Paris",
  ticketingUrl: "https://billets.example/12",
  links: [],
  broadcasters: [
    { name: "Chaîne Prélims", scope: "prelims" },
    { name: "RMC SPORT", scope: "main_card" },
  ],
  confirmedSchedule: false,
  fightCard: [],
  updatedAt: "2026-11-01T00:00:00.000Z",
};

describe("Session Live (section 12.3)", () => {
  it("seul le nom est obligatoire ; les champs vides restent vides", () => {
    expect(validateSessionInput({ eventName: "  " })).toEqual({
      ok: false,
      errors: { eventName: "Le nom de l'événement est obligatoire." },
    });
    const ok = validateSessionInput({ eventName: "HEXAGONE MMA", eventNumber: "", city: " " });
    expect(ok).toEqual({ ok: true, values: { eventName: "HEXAGONE MMA" } });
  });

  it("numéro et date validés", () => {
    expect(validateSessionInput({ eventName: "X", eventNumber: "douze" })).toMatchObject({
      ok: false,
      errors: { eventNumber: "Numéro : un entier positif." },
    });
    expect(validateSessionInput({ eventName: "X", date: "14/03/2026" })).toMatchObject({
      ok: false,
      errors: { date: "Date invalide (AAAA-MM-JJ)." },
    });
    expect(validateSessionInput({ eventName: "X", eventNumber: "12", date: "2026-03-14" })).toEqual(
      { ok: true, values: { eventName: "X", eventNumber: 12, date: "2026-03-14" } },
    );
  });

  it("pré-remplissage depuis la fiche : diffusion principale, pas les prélims", () => {
    expect(inputFromEvent(event)).toEqual({
      eventId: "event-12",
      eventName: "HEXAGONE MMA",
      eventNumber: 12,
      venue: "Salle Test",
      city: "Paris",
      date: "2026-03-14",
      broadcast: "RMC SPORT",
      ticketing: "https://billets.example/12",
    });
  });

  it("une seule session active ; terminer l'archive avec endedAt", async () => {
    const first = validateSessionInput({ eventName: "HEXAGONE MMA", eventNumber: 11 });
    const second = validateSessionInput(inputFromEvent(event));
    if (!first.ok || !second.ok) throw new Error("saisie invalide");
    const a = await startLiveSession(repository, first.values, new Date("2026-11-20T18:00:00Z"));
    const b = await startLiveSession(repository, second.values, new Date("2026-11-21T18:00:00Z"));
    expect((await activeSession(repository))?.id).toBe(b.id);
    expect(await repository.liveSessions.get(a.id)).toMatchObject({
      active: false,
      endedAt: "2026-11-21T18:00:00.000Z",
    });

    const updated = await updateLiveSession(repository, b.id, { ...second.values, city: "Lyon" });
    expect(updated).toMatchObject({ city: "Lyon", startedAt: b.startedAt, active: true });

    await endLiveSession(repository, b.id, new Date("2026-11-21T23:30:00Z"));
    expect(await activeSession(repository)).toBeUndefined();
    expect(await repository.liveSessions.get(b.id)).toMatchObject({
      active: false,
      endedAt: "2026-11-21T23:30:00.000Z",
    });
  });

  it("bandeau : seulement les champs renseignés", async () => {
    const values = validateSessionInput(inputFromEvent(event));
    if (!values.ok) throw new Error("saisie invalide");
    const session = await startLiveSession(repository, values.values);
    expect(sessionSummary(session)).toEqual(["HEXAGONE MMA 12", "Paris", "Diffusion : RMC SPORT"]);
    expect(sessionSummary({ ...session, city: undefined, broadcast: undefined })).toEqual([
      "HEXAGONE MMA 12",
    ]);
  });
});
