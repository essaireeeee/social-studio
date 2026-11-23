/**
 * Déclinaison native sur les autres plateformes (section 13.4). Réapplique les règles de
 * chaque plateforme au texte de la variante, sans rien inventer :
 * - X : raccourcissement par paragraphes entiers (post-traitement) ;
 * - TikTok : accroche immédiate, premier paragraphe de corps et hashtags seulement ;
 * - Facebook : contexte supplémentaire (date, lieu, diffusion) s'il figure dans le brief et
 *   pas encore dans le texte ;
 * - Instagram : le texte tel quel, post-traité.
 * Logique pure.
 */
import { isHashtagLine, normalizeText } from "@/lib/editorial/text-utils";
import type { Platform } from "@/types/domain";
import type { PostProcessResult } from "../post-process";
import type { VariableMap } from "./types";

const paragraphsOf = (text: string) => text.split(/\n\s*\n/).filter((p) => p.trim());
const isHashtagParagraph = (p: string) => p.split("\n").every((l) => !l.trim() || isHashtagLine(l));

function tiktokVersion(text: string): string {
  const paragraphs = paragraphsOf(text);
  const hashtags = paragraphs.filter(isHashtagParagraph);
  const content = paragraphs.filter((p) => !isHashtagParagraph(p));
  return [...content.slice(0, 2), ...hashtags].join("\n\n");
}

/** Lignes d'information du brief absentes du texte : rien d'autre n'est ajouté. */
export function contextLines(text: string, vars: VariableMap): string[] {
  const normalized = normalizeText(text);
  const missing = (value?: string) => Boolean(value) && !normalized.includes(normalizeText(value!));
  const lines: string[] = [];
  if (missing(vars.dateLabel)) lines.push(`🗓️ ${vars.dateLabel}`);
  const place = [vars.venue, vars.city].filter((v) => missing(v));
  if (place.length > 0) lines.push(`📍 ${place.join(", ")}`);
  if (missing(vars.broadcast)) lines.push(`📺 ${vars.broadcast}`);
  return lines;
}

function facebookVersion(text: string, vars: VariableMap): string {
  const lines = contextLines(text, vars);
  if (lines.length === 0) return text;
  const paragraphs = paragraphsOf(text);
  const at = paragraphs.findIndex(isHashtagParagraph);
  const index = at === -1 ? paragraphs.length : at;
  return [...paragraphs.slice(0, index), lines.join("\n"), ...paragraphs.slice(index)].join("\n\n");
}

export function declineNative(
  text: string,
  targets: readonly Platform[],
  ctx: { vars: VariableMap; process: (text: string, platform: Platform) => PostProcessResult },
): Partial<Record<Platform, PostProcessResult>> {
  const versions: Partial<Record<Platform, PostProcessResult>> = {};
  for (const platform of targets) {
    const raw =
      platform === "tiktok"
        ? tiktokVersion(text)
        : platform === "facebook"
          ? facebookVersion(text, ctx.vars)
          : text;
    versions[platform] = ctx.process(raw, platform);
  }
  return versions;
}
