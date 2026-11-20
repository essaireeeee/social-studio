import { describe, expect, it } from "vitest";
import {
  extractEmojis,
  extractHashtags,
  extractHook,
  jaccard,
  listEmojis,
  literalPattern,
  normalizeText,
  stripAccents,
  wordSet,
} from "@/lib/editorial/text-utils";
import { formatDateTime, plural } from "@/lib/format";

const RIGHT_QUOTE = String.fromCodePoint(0x2019);
const ZWSP = String.fromCodePoint(0x200b);
const NBSP = String.fromCodePoint(0xa0);

describe("normalizeText", () => {
  it("met en minuscules, retire accents et emojis, compacte les espaces", () => {
    expect(normalizeText("💥 KO  ÉCLAIR\n\nde Léo  🔥🔥 !")).toBe("ko eclair de leo !");
  });

  it("unifie les apostrophes typographiques et retire les caractères invisibles", () => {
    expect(normalizeText(`La ceinture d${RIGHT_QUOTE}HEXAGONE${ZWSP} MMA${NBSP}!`)).toBe(
      "la ceinture d'hexagone mma !",
    );
  });

  it("donne le même résultat pour deux textes qui ne diffèrent que par la forme", () => {
    expect(normalizeText("Énorme victoire 🏆\n#HexagoneMMA")).toBe(
      normalizeText("énorme   VICTOIRE #hexagonemma"),
    );
  });

  it("retire les emojis composés et les drapeaux sans laisser de résidu", () => {
    expect(normalizeText("Bravo 👨‍👩‍👧 🇫🇷 1️⃣ 👍🏽 ❤️ fin")).toBe("bravo fin");
  });
});

describe("extractEmojis", () => {
  it("compte un emoji composé comme un seul emoji", () => {
    expect(listEmojis("👨‍👩‍👧 et 👍🏽")).toEqual(["👨‍👩‍👧", "👍🏽"]);
  });

  it("reconnaît les emojis avec sélecteur de variante, drapeaux et touches", () => {
    expect(extractEmojis("🗓️ Samedi 🇫🇷 1️⃣ 📺")).toEqual(["🗓️", "🇫🇷", "1️⃣", "📺"]);
  });

  it("liste chaque emoji une seule fois, dans l'ordre", () => {
    expect(extractEmojis("🔥 KO 💥 🔥 🔥")).toEqual(["🔥", "💥"]);
    expect(listEmojis("🔥 KO 💥 🔥 🔥")).toHaveLength(4);
  });

  it("ne confond pas un hashtag avec une touche numérotée", () => {
    expect(extractEmojis("#HexagoneMMA #1")).toEqual([]);
  });
});

describe("extractHashtags", () => {
  it("extrait les hashtags avec lettres accentuées et chiffres, sans doublon de casse", () => {
    expect(extractHashtags("#HexagoneMMA #MMAFrance #hexagonemma #Été2026")).toEqual([
      "#HexagoneMMA",
      "#MMAFrance",
      "#Été2026",
    ]);
  });

  it("renvoie une liste vide sans hashtag", () => {
    expect(extractHashtags("Aucun hashtag ici.")).toEqual([]);
  });
});

describe("formats", () => {
  it("formate une date au format JJ/MM/AAAA HH:MM", () => {
    expect(formatDateTime("2026-11-20T14:33:00.000Z", "UTC")).toBe("20/11/2026 14:33");
  });

  it("accorde le pluriel", () => {
    expect(plural(1, "wording")).toBe("1 wording");
    expect(plural(6, "wording")).toBe("6 wordings");
    expect(plural(0, "wording")).toBe("0 wording");
  });

  it("retire les accents sans toucher au reste", () => {
    expect(stripAccents("Ça déménage à Évry !")).toBe("Ca demenage a Evry !");
  });
});

describe("accroche et similarité", () => {
  it("prend la première ligne non vide, avec sa position", () => {
    const text = "\n\n  💥 KO AU R1 !\nSuite";
    const hook = extractHook(text);
    expect(hook?.text).toBe("💥 KO AU R1 !");
    expect(text.slice(hook!.start, hook!.end)).toBe("💥 KO AU R1 !");
  });

  it("coupe à la première phrase si la première ligne dépasse 140 caractères", () => {
    const long = `Première phrase courte. ${"suite ".repeat(30)}`;
    expect(extractHook(long)?.text).toBe("Première phrase courte.");
    expect(extractHook("   \n ")).toBeNull();
  });

  it("compare des ensembles de mots sans hashtags, liens ni accents", () => {
    const a = wordSet("💥 KO éclair de Léo ! #HexagoneMMA https://x.fr");
    expect([...a].sort()).toEqual(["de", "eclair", "ko", "leo"]);
    expect(jaccard(a, wordSet("KO eclair de Leo"))).toBe(1);
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(1 / 3);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it("retrouve une expression quelle que soit l'accentuation", () => {
    const re = new RegExp(literalPattern("Préparez-vous à vivre"), "iu");
    expect(re.test("PREPAREZ-VOUS A  VIVRE une soirée")).toBe(true);
    expect(re.test("préparez-vous à vivres")).toBe(false);
  });
});
