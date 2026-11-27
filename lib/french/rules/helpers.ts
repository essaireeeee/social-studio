/**
 * Fabriques de règles. Une règle par motif : la correspondance entière est le passage
 * signalé ; le contexte se pose en regard arrière ou avant (`(?<=…)`, `(?=…)`).
 */
import { keepCase } from "../text";
import type { FrenchMatch, FrenchRule, RuleContext } from "../types";

type Replace = string | ((match: RegExpExecArray, ctx: RuleContext) => string | null | undefined);

/**
 * Détection par expression régulière (drapeaux par défaut : `gu`, plus `i` si demandé).
 * `replace` : texte (casse de l'original conservée) ou fonction ; `null` écarte l'occurrence.
 */
export function regex(
  source: string,
  replace?: Replace,
  options: { flags?: string; message?: (m: RegExpExecArray) => string; keepCase?: boolean } = {},
): FrenchRule["detect"] {
  const flags = options.flags ?? "giu";
  const re = new RegExp(source, flags.includes("g") ? flags : `${flags}g`);
  return (text, ctx) => {
    const out: FrenchMatch[] = [];
    for (const m of text.matchAll(re)) {
      if (m[0].length === 0) continue;
      const exec = m as RegExpExecArray;
      let replacement: string | undefined;
      if (typeof replace === "string") {
        replacement = options.keepCase === false ? replace : keepCase(m[0], replace);
      } else if (replace) {
        const value = replace(exec, ctx);
        if (value === null) continue;
        replacement = value;
      }
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        replacement,
        message: options.message?.(exec),
      });
    }
    return out;
  };
}

/** Plusieurs détecteurs pour une même règle. */
export function any(...detectors: FrenchRule["detect"][]): FrenchRule["detect"] {
  return (text, ctx) => detectors.flatMap((detect) => detect(text, ctx));
}

/** Remplace un mot selon une table, en gardant la casse. */
export function fromTable(table: Readonly<Record<string, string>>) {
  return (m: RegExpExecArray) => {
    const value = table[m[0].toLowerCase()];
    return value === undefined ? null : keepCase(m[0], value);
  };
}

type Def = Omit<FrenchRule, "detect"> & { detect: FrenchRule["detect"] };

/** Déclaration typée d'une règle (identité, sert à garder les fichiers lisibles). */
export function rule(def: Def): FrenchRule {
  return def;
}

/** Gabarit brut : les barres obliques inverses restent telles quelles (`\p{L}`, `\s`…). */
export const r = String.raw;

/** Mot qui ressemble à un participe passé (gagné, pris, battu, battues…). */
export const PARTICIPLE = String.raw`\p{L}{2,}(?:é|ée|és|ées|i|ie|is|it|u|ue|us)`;
/** Mot qui ressemble à un infinitif. */
export const INFINITIVE = String.raw`\p{L}{2,}(?:er|ir|re)`;
