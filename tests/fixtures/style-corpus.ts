/**
 * Corpus de style construit pour des comptages connus d'avance.
 *
 * 20 publications LIVE réelles :
 * - 12 KO   : « 💥 KO de <nom> au R<n> ! », corps A (6) ou B (6), CTA « Rendez-vous » (7),
 *             #HexagoneMMA partout, #MMAFrance sur les 6 premiers ;
 * - 8 décisions : « 🏆 Victoire de <nom> par décision unanime », corps C (8),
 *             CTA « 🎫 Billetterie… lien en bio » (5), #HexagoneMMA.
 * Plus, à exclure : 3 démos LIVE, 1 LIVE non référence, 2 DAILY.
 */
import { createWording } from "@/lib/database/wording-factory";
import type { Fighter, Wording } from "@/types/domain";
import { NOW, fixedNow } from "./entities";

export const CORPUS_FIGHTERS: Fighter[] = [
  ["Jean", "Testeur"],
  ["Paul", "Fictif"],
  ["Marc", "Essai"],
  ["Léo", "Brouillon"],
].map(([firstName, lastName], i) => ({
  id: `fighter-corpus-${i}`,
  firstName: firstName!,
  lastName: lastName!,
  fightHistory: [],
  updatedAt: NOW,
}));

const name = (i: number) => {
  const f = CORPUS_FIGHTERS[i % CORPUS_FIGHTERS.length]!;
  return `${f.firstName} ${f.lastName}`;
};

export const BODY_A = "Une démonstration de puissance dans la cage.";
export const BODY_B = "La salle a vibré du début à la fin.";
export const BODY_C = "Trois rounds intenses, une maîtrise totale.";
export const CTA_RDV = "Rendez-vous samedi prochain.";
export const CTA_TICKETS = "🎫 Billetterie de la prochaine soirée : lien en bio";

function koPost(i: number): string {
  return [
    `💥 KO de ${name(i)} au R${(i % 3) + 1} !`,
    "",
    i < 6 ? BODY_A : BODY_B,
    ...(i < 7 ? ["", CTA_RDV] : []),
    "",
    i < 6 ? "#HexagoneMMA #MMAFrance" : "#HexagoneMMA",
  ].join("\n");
}

function decisionPost(j: number): string {
  return [
    `🏆 Victoire de ${name(j)} par décision unanime`,
    "",
    BODY_C,
    ...(j < 5 ? ["", CTA_TICKETS] : []),
    "",
    "#HexagoneMMA",
  ].join("\n");
}

const live = (
  id: string,
  text: string,
  categoryId: string,
  extra: Partial<Parameters<typeof createWording>[0]> = {},
) =>
  createWording(
    { id, text, mode: "live", categoryId, platform: "instagram", source: "manual", ...extra },
    fixedNow(),
  );

export async function buildStyleCorpus(): Promise<Wording[]> {
  const real = await Promise.all([
    ...Array.from({ length: 12 }, (_, i) => live(`ko-${i}`, koPost(i), "live_ko")),
    ...Array.from({ length: 8 }, (_, j) => live(`dec-${j}`, decisionPost(j), "live_decision")),
  ]);
  const excluded = await Promise.all([
    live("demo-1", "💥 KO démo !\n\n#HexagoneMMA", "live_ko", { isDemo: true }),
    live("demo-2", "🏆 Champion démo\n\n#HexagoneMMA", "live_champion", { isDemo: true }),
    live("demo-3", "🎤 « Citation démo »\n\n#HexagoneMMA", "live_reaction", { isDemo: true }),
    live("not-reference", "🔥🔥🔥 Texte écarté du style", "live_crowd", { isReference: false }),
    createWording(
      {
        id: "daily-1",
        text: "📢 Annonce DAILY #Annonce",
        mode: "daily",
        categoryId: "daily_fight_announce",
        platform: "instagram",
        source: "manual",
      },
      fixedNow(),
    ),
    createWording(
      {
        id: "daily-2",
        text: "📰 Relais presse DAILY",
        mode: "daily",
        categoryId: "media_press",
        platform: "instagram",
        source: "manual",
      },
      fixedNow(),
    ),
  ]);
  return [...real, ...excluded];
}
