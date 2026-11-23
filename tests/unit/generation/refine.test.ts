import { describe, expect, it } from "vitest";
import { getCategory } from "@/lib/categories/registry";
import { styleParameters } from "@/lib/editorial/profile-service";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import { listEmojis } from "@/lib/editorial/text-utils";
import { buildBriefContext } from "@/lib/generation/native/context";
import { generateNative, type NativeEngineInput } from "@/lib/generation/native/engine";
import {
  CUSTOM_NATIVE_MESSAGE,
  RefineUnavailableError,
  refineNative,
} from "@/lib/generation/native/refine";
import { splitLongSentence } from "@/lib/generation/native/text-refine";
import type { Brief, RefineAction, VariantKind } from "@/types/domain";
import { POOL_FIGHTERS, randomBriefs, type RandomBrief } from "../../fixtures/random-briefs";

function engineFor(sample: RandomBrief): NativeEngineInput {
  const category = getCategory(sample.brief.categoryId)!;
  return {
    brief: sample.brief,
    category,
    context: buildBriefContext(sample.brief, category, {
      fighters: POOL_FIGHTERS,
      liveSession: sample.liveSession,
      hashtags: sample.hashtags,
      cta: sample.brief.cta,
    }),
    style: { params: styleParameters(undefined, sample.brief.mode) },
    references: [],
    recentHooks: [],
    rules: DEFAULT_EDITORIAL_RULES,
    frenchSpacing: true,
    regenerationCount: 0,
  };
}

const sample = (categoryId: string, fields: Brief["fields"], mode: Brief["mode"] = "live") => ({
  brief: { mode, categoryId, platform: "instagram" as const, fields, hashtagIds: [] },
  hashtags: ["#HexagoneMMA"],
});

const ko = sample("live_ko", {
  winner: "Karim Fictif",
  loser: "Tom Essai",
  method: "KO",
  round: "R1",
  time: "3:12",
});

function refine(input: RandomBrief, action: RefineAction, kind: VariantKind = "signature") {
  const engine = engineFor(input);
  const variant = generateNative(engine).variants.find((v) => v.kind === kind)!;
  const result = refineNative({
    engine,
    kind,
    text: variant.text,
    templateId: variant.templateId,
    action,
    count: 1,
  });
  return { variant, result };
}

const bodyOf = (text: string) => text.split("\n").slice(1).join("\n");

describe("retouches natives (section 11.4)", () => {
  it("new_hook : seule la première ligne change", () => {
    const { variant, result } = refine(ko, "new_hook");
    expect(result.text.split("\n")[0]).not.toBe(variant.text.split("\n")[0]);
    expect(bodyOf(result.text)).toBe(bodyOf(variant.text));
  });

  it("shorten : plus court, accroche conservée", () => {
    const { variant, result } = refine(ko, "shorten", "storytelling");
    expect(result.text.length).toBeLessThan(variant.text.length);
    expect(result.text.split("\n")[0]).toBe(variant.text.split("\n")[0]);
  });

  it("institutional : un emoji au plus, aucune exclamation", () => {
    const { result } = refine(ko, "institutional", "punchy");
    expect(listEmojis(result.text).length).toBeLessThanOrEqual(1);
    expect(result.text).not.toContain("!");
  });

  it("toggle_emojis : retire tout, puis remet selon le profil", () => {
    const engine = engineFor(ko);
    const variant = generateNative(engine).variants[0]!;
    const base = { engine, kind: variant.kind, templateId: variant.templateId, count: 1 };
    const without = refineNative({ ...base, text: variant.text, action: "toggle_emojis" });
    expect(listEmojis(without.text)).toEqual([]);
    const back = refineNative({ ...base, text: without.text, action: "toggle_emojis" });
    expect(listEmojis(back.text).length).toBeGreaterThanOrEqual(1);
  });

  it("punchier : accroche punchy, phrases de plus de 15 mots coupées", () => {
    expect(
      splitLongSentence(
        "Karim Fictif a imposé son rythme du début à la fin, et Tom Essai n'a jamais trouvé la solution face à lui.",
      ),
    ).toBe(
      "Karim Fictif a imposé son rythme du début à la fin. Tom Essai n'a jamais trouvé la solution face à lui.",
    );
    const { variant, result } = refine(ko, "punchier", "storytelling");
    expect(result.text).not.toBe(variant.text);
  });

  it("rephrase : même modèle, autres formulations ; regenerate : autre modèle", () => {
    const rephrased = refine(ko, "rephrase");
    expect(rephrased.result.templateId).toBe(rephrased.variant.templateId);
    expect(rephrased.result.text).not.toBe(rephrased.variant.text);
    const regenerated = refine(ko, "regenerate");
    expect(regenerated.result.templateId).not.toBe(regenerated.variant.templateId);
  });

  it("custom : indisponible en natif, avec le message de l'infobulle", () => {
    expect(() => refine(ko, "custom")).toThrow(new RefineUnavailableError(CUSTOM_NATIVE_MESSAGE));
    expect(CUSTOM_NATIVE_MESSAGE).toBe("Consigne libre disponible avec un moteur IA connecté");
  });

  it("texte déjà minimal : refus explicite plutôt qu'une révision identique", () => {
    const engine = engineFor(ko);
    expect(() =>
      refineNative({
        engine,
        kind: "punchy",
        text: "💥 KO de Karim Fictif !",
        action: "shorten",
        count: 0,
      }),
    ).toThrow(RefineUnavailableError);
  });
});

describe("propriété : aucune retouche native n'invente un fait (100 briefs)", () => {
  const ACTIONS: RefineAction[] = [
    "shorten",
    "punchier",
    "institutional",
    "new_hook",
    "toggle_emojis",
    "rephrase",
    "regenerate",
  ];

  it("zéro avertissement du Fact Guard, quelle que soit l'action", () => {
    const failures: string[] = [];
    for (const input of randomBriefs(100, 7)) {
      const engine = engineFor(input);
      for (const variant of generateNative(engine).variants) {
        for (const action of ACTIONS) {
          try {
            const result = refineNative({
              engine,
              kind: variant.kind,
              text: variant.text,
              templateId: variant.templateId,
              action,
              count: 2,
            });
            if (result.factWarnings.length > 0) {
              failures.push(
                `${input.brief.categoryId}/${variant.kind}/${action}: ${JSON.stringify(result.factWarnings)}`,
              );
            }
          } catch (error) {
            if (!(error instanceof RefineUnavailableError)) throw error;
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
