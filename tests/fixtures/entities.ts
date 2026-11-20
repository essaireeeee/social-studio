/** Entités de test valides, une par table. Noms clairement fictifs. */
import Dexie from "dexie";
import { createDatabase } from "@/lib/database/db";
import { DexieRepository } from "@/lib/database/dexie-repository";
import type { EntityMap } from "@/lib/database/repository";
import { createWording } from "@/lib/database/wording-factory";
import type { TableName } from "@/lib/database/snapshot";
import type { StyleProfile } from "@/types/domain";

export const NOW = "2026-11-20T14:00:00.000Z";
export const fixedNow = () => new Date(NOW);

/** Repository sur une base IndexedDB (fake-indexeddb) isolée. */
export function createTestRepository(): DexieRepository {
  return new DexieRepository(createDatabase(`test-${crypto.randomUUID()}`), fixedNow);
}

export async function disposeRepository(repository: DexieRepository): Promise<void> {
  const name = repository.db.name;
  repository.close();
  await Dexie.delete(name);
}

export function sampleWording(overrides: Partial<Parameters<typeof createWording>[0]> = {}) {
  return createWording(
    {
      text: "💥 KO de Jean Testeur au R1 !\n\nIl n'a laissé aucune chance.\n\n#HexagoneMMA #MMAFrance",
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      source: "manual",
      fighterIds: ["fighter-test-1"],
      tags: ["ko"],
      ...overrides,
    },
    fixedNow(),
  );
}

export const sampleStyleProfile: StyleProfile = {
  id: "profile-test",
  mode: "live",
  createdAt: NOW,
  corpusSize: 0,
  corpusIds: [],
  includesDemo: false,
  confidence: "insufficient",
  status: "proposed",
  length: { charsMean: 0, charsMedian: 0, charsP90: 0, linesMedian: 0, paragraphsMedian: 0 },
  emojis: { top: [], perPostMedian: 0, perPostP90: 0, lineStartRatio: 0 },
  hashtags: { top: [], perPostMedian: 0, position: "end" },
  hooks: {
    samples: [],
    patterns: [],
    uppercaseRatio: 0,
    exclamationRatio: 0,
    questionRatio: 0,
    avgWords: 0,
  },
  ctas: { top: [] },
  ngrams: { bigrams: [], trigrams: [], quadgrams: [] },
  vocabulary: { top: [] },
  structures: [],
  overused: [],
  punctuation: { exclamationPerPost: 0, ellipsisPerPost: 0, uppercaseWordRatio: 0 },
};

/** Une entité valide par table (le wording est asynchrone à cause du hash). */
export async function sampleEntities(): Promise<{ [K in TableName]: EntityMap[K] }> {
  return {
    wordings: await sampleWording({ id: "wording-test-1" }),
    fighters: {
      id: "fighter-test-1",
      firstName: "Jean",
      lastName: "Testeur",
      nickname: "La Foudre",
      weightClass: "Poids légers",
      fightHistory: [{ date: "2026-03-14", opponent: "Paul Fictif", result: "W", method: "KO" }],
      updatedAt: NOW,
    },
    events: {
      id: "event-test-1",
      name: "HEXAGONE MMA",
      number: 12,
      date: "2026-03-14",
      city: "Ville Test",
      venue: "Salle Test",
      links: [],
      broadcasters: [{ name: "Chaîne Test", scope: "full" }],
      confirmedSchedule: false,
      fightCard: [{ fighterAId: "fighter-test-1", fighterBId: "fighter-test-2", position: "main" }],
      updatedAt: NOW,
    },
    liveSessions: {
      id: "session-test-1",
      eventName: "HEXAGONE MMA 12",
      eventNumber: 12,
      city: "Ville Test",
      startedAt: NOW,
      active: true,
    },
    generations: {
      id: "generation-test-1",
      createdAt: NOW,
      updatedAt: NOW,
      brief: {
        mode: "live",
        categoryId: "live_ko",
        platform: "instagram",
        fields: { winner: "Jean Testeur", loser: "Paul Fictif", round: "R1" },
        hashtagIds: ["hashtags-official"],
      },
      engine: "native",
      referenceIds: [],
      variants: [
        {
          id: "variant-test-1",
          kind: "signature",
          selected: true,
          revisions: [
            {
              id: "revision-test-1",
              text: "💥 KO !",
              createdAt: NOW,
              origin: "native",
              factWarnings: [],
            },
          ],
        },
      ],
      status: "draft",
    },
    hashtagGroups: {
      id: "hashtags-test",
      name: "Campagne test",
      kind: "campaign",
      tags: ["#CampagneTest"],
      defaultOn: false,
      modes: ["daily"],
      order: 5,
    },
    signatures: {
      id: "signature-test",
      name: "Signature test",
      template: "🗓️ {date}",
      requiredFields: ["date"],
      requiresConfirmedSchedule: false,
      modes: ["daily"],
      enabled: true,
      order: 3,
    },
    rules: {
      id: "rule-test",
      label: "Règle de test",
      kind: "forbid",
      values: ["formule interdite"],
      enabled: true,
      editableBy: "admin",
    },
    styleProfiles: sampleStyleProfile,
    users: { id: "user-test", name: "CM Test", role: "cm" },
    blobs: {
      id: "blob-test",
      kind: "logo",
      mimeType: "image/png",
      data: "iVBORw0KGgo=",
      size: 8,
      updatedAt: NOW,
    },
  };
}
