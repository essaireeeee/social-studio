/** Bibliothèque de test pour la recherche des références. Noms clairement fictifs. */
import { createWording, type WordingInput } from "@/lib/database/wording-factory";
import type { Fighter, Wording } from "@/types/domain";
import { NOW } from "./entities";

export const KARIM: Fighter = {
  id: "fighter-karim",
  firstName: "Karim",
  lastName: "Fictif",
  nickname: "Le Marteau",
  fightHistory: [],
  updatedAt: NOW,
};
export const TOM: Fighter = {
  id: "fighter-tom",
  firstName: "Tom",
  lastName: "Essai",
  fightHistory: [],
  updatedAt: NOW,
};
export const ALI: Fighter = {
  id: "fighter-ali",
  firstName: "Ali",
  lastName: "Brouillon",
  fightHistory: [],
  updatedAt: NOW,
};
export const RETRIEVAL_FIGHTERS = [KARIM, TOM, ALI];

/** Date de publication à `days` jours de la date de référence. */
const daysAgo = (days: number) =>
  new Date(Date.parse(NOW) - days * 86_400_000).toISOString().slice(0, 10);

const post = (input: Partial<WordingInput> & Pick<WordingInput, "id" | "text" | "categoryId">) =>
  createWording(
    { mode: "live", platform: "instagram", source: "manual", date: daysAgo(30), ...input },
    new Date(NOW),
  );

export async function buildRetrievalCorpus(): Promise<Wording[]> {
  return Promise.all([
    post({
      id: "ko-karim",
      categoryId: "live_ko",
      fighterIds: [KARIM.id],
      text: "💥 KO de Karim Fictif au R1 !\n\nUne droite, c'est fini.\n\n#HexagoneMMA",
    }),
    post({
      id: "ko-tom",
      categoryId: "live_ko",
      fighterIds: [TOM.id],
      text: "💥 KO de Tom Essai au R2 !\n\nLa salle explose.\n\n#HexagoneMMA",
    }),
    post({
      id: "ko-ali",
      categoryId: "live_ko",
      text: "💥 Ali Brouillon éteint la lumière !\n\nTrois coups, terminé.\n\n#HexagoneMMA",
    }),
    post({
      id: "sub-karim",
      categoryId: "live_sub",
      text: "🐍 Soumission de Karim Fictif, étranglement arrière au R3.\n\n#HexagoneMMA",
    }),
    post({
      id: "result-ali",
      categoryId: "live_result",
      text: "🏆 Victoire de Ali Brouillon par décision.\n\n#HexagoneMMA",
    }),
    post({
      id: "crowd",
      categoryId: "live_crowd",
      platform: "x",
      text: "🔥 La salle est debout pour le main event.",
    }),
    post({
      id: "demo-ko-karim",
      categoryId: "live_ko",
      isDemo: true,
      text: "💥 KO démo de Karim Fictif !",
    }),
    post({
      id: "nonref-ko-karim",
      categoryId: "live_ko",
      isReference: false,
      text: "💥 KO de Karim Fictif, version écartée.",
    }),
    post({
      id: "daily-karim",
      mode: "daily",
      categoryId: "daily_fight_announce",
      fighterIds: [KARIM.id],
      text: "📢 COMBAT OFFICIEL : Karim Fictif affrontera Tom Essai. KO garanti ?",
    }),
    post({
      id: "media-karim",
      mode: "daily",
      categoryId: "media_press",
      text: "📰 Karim Fictif se confie avant son KO.",
    }),
  ]);
}
