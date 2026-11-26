import { describe, expect, it } from "vitest";
import { copyCheck, longestCommonRun } from "@/lib/generation/anti-copy";
import { buildAllowedFacts, factGuard } from "@/lib/generation/fact-guard";
import { adaptToPlatform, cleanupText } from "@/lib/generation/post-process";
import { renderSignature, signatureValues } from "@/lib/generation/signature";
import type { HexEvent, Signature } from "@/types/domain";

const guard = (text: string, facts: (string | number)[], vocabulary?: string[]) =>
  factGuard(text, {
    allowed: buildAllowedFacts(facts),
    vocabulary: vocabulary && new Set(vocabulary),
  });
const kinds = (text: string, facts: (string | number)[]) =>
  guard(text, facts).map((w) => [w.kind, w.value]);

describe("Fact Guard", () => {
  it("laisse passer les faits du brief, quelle que soit leur casse", () => {
    expect(
      guard("💥 KO de Karim Fictif au 1er round, à 3:12.", ["Karim Fictif", "1er round", "3:12"]),
    ).toEqual([]);
    expect(guard("💥 KARIM FICTIF !", ["Karim Fictif"])).toEqual([]);
    expect(
      guard("La ceinture d'HEXAGONE MMA 12 reste à Paris.", ["HEXAGONE MMA 12", "Paris"]),
    ).toEqual([]);
  });

  it("signale un nombre, un horaire, une date ou un nom absents du brief", () => {
    expect(kinds("KO de Karim Fictif au 2e round.", ["Karim Fictif"])).toEqual([["number", "2e"]]);
    expect(kinds("Début à 20h30.", [])).toEqual([["time", "20h30"]]);
    expect(kinds("Rendez-vous samedi.", [])).toEqual([["date", "samedi"]]);
    expect(kinds("Victoire de Karim face à Jean Dupont.", ["Karim"])).toEqual([
      ["proper_noun", "Jean Dupont"],
    ]);
  });

  it("signale un diffuseur ou un prix non fournis", () => {
    expect(kinds("En direct sur DAZN.", [])).toEqual([["broadcaster", "DAZN"]]);
    expect(kinds("Places à 35 €.", [])).toEqual([["price", "35"]]);
    expect(guard("En direct sur RMC Sport.", ["RMC SPORT"])).toEqual([]);
  });

  it("ignore hashtags, mentions et liens, et les mots courants en capitales", () => {
    expect(guard("KO ! #HexagoneMMA2026 @hexagonemma https://x.fr/12", [])).toEqual([]);
    expect(guard("NOUVEAU CHAMPION !", [], ["nouveau", "champion"])).toEqual([]);
  });

  it("ne confond pas un début de phrase avec un nom propre", () => {
    expect(guard("Victoire nette. Bravo à tous.\n🔥 Quelle soirée : Respect.", [])).toEqual([]);
  });

  it("donne la position exacte du passage à vérifier", () => {
    const text = "KO au 2e round.";
    const [warning] = guard(text, []);
    expect(text.slice(warning!.start, warning!.end)).toBe("2e");
  });
});

describe("anti-copie", () => {
  const reference = {
    id: "ref",
    text: "Une démonstration de puissance dans la cage ce soir pour la ligue",
  };

  it("détecte 8 mots consécutifs communs", () => {
    expect(
      copyCheck("Encore une démonstration de puissance dans la cage ce soir pour tout le monde", [
        reference,
      ]).copied,
    ).toBe(true);
  });

  it("laisse passer une formulation différente", () => {
    const result = copyCheck("Une victoire nette dans la cage.", [reference]);
    expect(result.copied).toBe(false);
    expect(result.longestRun).toBeLessThan(8);
  });

  it("calcule la plus longue suite commune", () => {
    expect(longestCommonRun(["a", "b", "c", "d"], ["x", "b", "c", "d", "y"])).toBe(3);
  });
});

describe("signatures", () => {
  const eventSignature: Signature = {
    id: "s",
    name: "Signature événementielle",
    template:
      "🗓️ {date} - {venue}, {city}\n📺 En direct sur {broadcaster}\n🎫 Prenez vos places dès maintenant !\n(Lien en bio du profil)",
    requiredFields: ["date", "venue", "city"],
    requiresConfirmedSchedule: false,
    modes: ["daily"],
    enabled: true,
    order: 0,
  };
  const event: HexEvent = {
    id: "e",
    name: "HEXAGONE MMA",
    number: 12,
    date: "2026-03-14",
    venue: "Salle Test",
    city: "Paris",
    links: [],
    broadcasters: [],
    confirmedSchedule: false,
    milestones: [],
    fightCard: [],
    updatedAt: "2026-11-20T14:00:00.000Z",
  };

  it("rend la signature et retire la ligne dont la variable est vide", () => {
    const rendered = renderSignature(eventSignature, signatureValues({ event }));
    expect(rendered.text).toBe(
      "🗓️ samedi 14 mars - Salle Test, Paris\n🎫 Prenez vos places dès maintenant !\n(Lien en bio du profil)",
    );
  });

  it("n'ajoute rien si un champ requis manque, et dit lequel", () => {
    const rendered = renderSignature(
      eventSignature,
      signatureValues({ event: { ...event, venue: undefined, date: undefined } }),
    );
    expect(rendered.text).toBeUndefined();
    expect(rendered.missing).toEqual(["date", "salle"]);
  });

  it("sans horaires confirmés, aucune ligne horaire", () => {
    const broadcast: Signature = {
      ...eventSignature,
      template:
        "📺 En direct à partir de {prelimsTime} sur {prelimsChannel} et à partir de {mainTime} pour la carte principale sur {mainChannel}",
      requiredFields: ["prelimsTime", "prelimsChannel", "mainTime", "mainChannel"],
      requiresConfirmedSchedule: true,
    };
    const scheduled: HexEvent = {
      ...event,
      broadcasters: [
        { name: "Chaîne A", startTime: "19h", scope: "prelims" },
        { name: "Chaîne B", startTime: "21h", scope: "main_card" },
      ],
    };
    expect(
      renderSignature(broadcast, signatureValues({ event: scheduled }), false).text,
    ).toBeUndefined();
    const confirmed = { ...scheduled, confirmedSchedule: true };
    expect(renderSignature(broadcast, signatureValues({ event: confirmed }), true).text).toBe(
      "📺 En direct à partir de 19h sur Chaîne A et à partir de 21h pour la carte principale sur Chaîne B",
    );
  });
});

describe("nettoyage et adaptation plateforme", () => {
  it("nettoie les espaces et les lignes vides multiples", () => {
    expect(cleanupText("KO  !\n\n\n\nTexte , fin .  ")).toBe("KO !\n\nTexte, fin.");
  });

  it("raccourcit par paragraphes entiers pour X, sans toucher à l'accroche", () => {
    const text = ["💥 KO !", "a".repeat(200), "b".repeat(200)].join("\n\n");
    const result = adaptToPlatform(text, "x");
    expect(result.adapted).toBe(true);
    expect(result.text).toBe(["💥 KO !", "a".repeat(200)].join("\n\n"));
  });
});
