/**
 * Retouches du moteur natif (section 11.4). Chaque action a une implémentation locale
 * réelle ; la consigne libre (`custom`) exige un moteur IA. Le résultat passe par le même
 * post-traitement que la génération. Logique pure : l'appelant crée la `Revision`.
 */
import { rankEmojis } from "@/lib/editorial/emoji";
import { RULE_IDS } from "@/lib/editorial/rules";
import { structureFingerprint } from "@/lib/editorial/structure";
import { jaccard, listEmojis, wordSet } from "@/lib/editorial/text-utils";
import type { RefineAction, VariantKind } from "@/types/domain";
import type { PostProcessResult } from "../post-process";
import { createRng, hashString } from "../random";
import { compose, isRenderable } from "./composer";
import { prepareNative, type Candidate, type NativeEngineInput, type NativeSource } from "./engine";
import { templatesFor } from "./templates";
import {
  addEmojis,
  cutLongSentences,
  hasEmojis,
  institutionalText,
  removeEmojis,
  shortenText,
} from "./text-refine";
import type { Template } from "./types";

export const CUSTOM_NATIVE_MESSAGE = "Consigne libre disponible avec un moteur IA connecté";
const ATTEMPTS = 5;

/** Retouche impossible sur ce texte : rien n'est enregistré, le message est affiché. */
export class RefineUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefineUnavailableError";
  }
}

export interface NativeRefineInput {
  engine: NativeEngineInput;
  kind: VariantKind;
  /** Texte courant de la variante (dernière révision). */
  text: string;
  /** Modèle natif de la variante, s'il est connu. */
  templateId?: string;
  action: RefineAction;
  /** Nombre de révisions déjà faites : fait varier les tirages. */
  count: number;
}

export interface NativeRefineResult extends PostProcessResult {
  templateId?: string;
}

/** Comparaison exacte, espaces (insécables compris) neutralisés : un emoji ou un « ! » compte. */
const canonical = (text: string) => text.replace(/[\s\u00A0\u202F]+/g, " ").trim();
const same = (a: string, b: string) => canonical(a) === canonical(b);

function firstLineIndex(lines: readonly string[]): number {
  return Math.max(
    0,
    lines.findIndex((line) => line.trim() !== ""),
  );
}

function replaceHook(text: string, hook: string): string {
  const lines = text.split("\n");
  lines[firstLineIndex(lines)] = hook;
  return lines.join("\n");
}

/** Nouvelle accroche tirée dans les modèles de la variante (et les accroches gardées). */
function drawHook(input: NativeRefineInput, kind: VariantKind, seed: number): string | undefined {
  const { engine } = input;
  const lines = input.text.split("\n");
  const current = lines[firstLineIndex(lines)] ?? "";
  const saved = (engine.savedHooks ?? [])
    .filter((h) => h.mode === engine.brief.mode && h.categoryId === engine.category.id)
    .map((h) => h.pattern);
  const options = [
    ...new Set([
      ...templatesFor(engine.category.id, kind).flatMap((t) =>
        t.segments.filter((s) => s.block === "H").flatMap((s) => s.options),
      ),
      ...saved,
    ]),
  ].filter((option) => isRenderable(option, engine.context.vars));

  const profileTop = engine.style.profile?.emojis.top.map((e) => e.emoji) ?? [];
  const emojis = rankEmojis(engine.category.id, profileTop);
  const budget = Math.min(2, listEmojis(current).length);
  const currentWords = wordSet(current);
  const rendered = options
    .map((option, i) => {
      const template: Template = {
        id: `hook-${i}`,
        categoryIds: [engine.category.id],
        variant: kind,
        structure: "H",
        segments: [{ block: "H", role: "hook", options: [option] }],
      };
      return compose(template, {
        vars: engine.context.vars,
        rng: createRng(hashString(`${seed}:${i}`)),
        emojis: [...emojis.slice(i % Math.max(1, emojis.length)), ...emojis],
        emojiBudget: budget,
        hashtagPosition: "end",
      })?.hook;
    })
    .filter((hook): hook is string => Boolean(hook) && !same(hook!, current));
  const distinct = rendered.filter((hook) => jaccard(wordSet(hook), currentWords) < 0.5);
  const pool = distinct.length > 0 ? distinct : rendered;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(createRng(hashString(`${seed}:pick`))() * pool.length)];
}

/** Premier rendu des modèles retenus dont le texte diffère du texte courant. */
function redraw(
  source: NativeSource,
  input: NativeRefineInput,
  only: (template: Template) => boolean,
  accept: (candidate: Candidate) => boolean = () => true,
): Candidate | undefined {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const found = source
      .candidatesFor(input.kind, attempt, only)
      .find((c) => !same(c.composition.text, input.text) && accept(c));
    if (found) return found;
  }
  return undefined;
}

export function refineNative(input: NativeRefineInput): NativeRefineResult {
  const { engine, action } = input;
  if (action === "custom") throw new RefineUnavailableError(CUSTOM_NATIVE_MESSAGE);

  const source = prepareNative({
    ...engine,
    regenerationCount: engine.regenerationCount + input.count + 1,
  });
  const seed = hashString(`${source.seed}:${action}:${input.count}`);
  const vars = engine.context.vars;
  const finish = (
    text: string,
    unchanged = "Cette retouche ne change rien à ce texte.",
  ): NativeRefineResult => {
    if (same(text, input.text)) throw new RefineUnavailableError(unchanged);
    return { ...source.processText(text), templateId: input.templateId };
  };

  switch (action) {
    case "shorten": {
      const lexicon = engine.rules.find((r) => r.id === RULE_IDS.ctaLexicon)?.values;
      const text = shortenText(input.text, { vars, ctaLexicon: lexicon });
      if (same(text, input.text)) {
        throw new RefineUnavailableError(
          "Texte déjà au plus court : l'accroche et l'information principale restent.",
        );
      }
      return finish(text);
    }
    case "punchier": {
      const hook = drawHook(input, "punchy", seed);
      const withHook = hook ? replaceHook(input.text, hook) : input.text;
      return finish(cutLongSentences(withHook, vars.signature));
    }
    case "institutional":
      return finish(institutionalText(input.text, vars), "Ce texte a déjà un ton institutionnel.");
    case "new_hook": {
      const hook = drawHook(input, input.kind, seed);
      if (!hook) {
        throw new RefineUnavailableError("Aucune autre accroche disponible pour ce brief.");
      }
      return finish(replaceHook(input.text, hook));
    }
    case "toggle_emojis": {
      if (hasEmojis(input.text)) return finish(removeEmojis(input.text));
      const profileTop = engine.style.profile?.emojis.top.map((e) => e.emoji) ?? [];
      const budget = Math.max(1, Math.round(engine.style.params.emojisPerPostMedian));
      return finish(addEmojis(input.text, rankEmojis(engine.category.id, profileTop), budget));
    }
    case "rephrase": {
      const known = templatesFor(engine.category.id, input.kind).some(
        (t) => t.id === input.templateId,
      );
      // Texte d'origine IA ou édité sans modèle connu : même structure, n'importe quel modèle.
      const fingerprint = structureFingerprint(input.text, { broadcasters: engine.broadcasters });
      const candidate = known
        ? redraw(source, input, (t) => t.id === input.templateId)
        : redraw(
            source,
            input,
            () => true,
            (c) => c.composition.structure === fingerprint,
          );
      if (!candidate) {
        throw new RefineUnavailableError(
          "Aucune autre formulation native avec la même structure : utilisez « Régénérer ».",
        );
      }
      return source.finalize(input.kind, candidate.composition, candidate.score);
    }
    case "regenerate": {
      const candidate =
        redraw(source, input, (t) => t.id !== input.templateId) ??
        redraw(source, input, () => true);
      if (!candidate) {
        throw new RefineUnavailableError("Aucune autre proposition disponible pour ce brief.");
      }
      return source.finalize(input.kind, candidate.composition, candidate.score);
    }
  }
}
