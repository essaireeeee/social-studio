/**
 * Fabrique de modèles : chaque catégorie fournit ses formulations (accroches, corps,
 * contexte...) et reçoit 3 modèles par variante, aux squelettes différents (section 10.3).
 *
 * - Punchy : H-B(-T), court, sans CTA ni signature.
 * - Signature : accroche, corps, information, CTA, signature, hashtags (ordre ajustable
 *   selon l'empreinte la plus fréquente du profil).
 * - Storytelling : accroche d'angle, deux paragraphes ou plus, citation éventuelle, CTA.
 *
 * Les rôles « closing » et « question » sont présents mais rendus seulement sur décision
 * du moteur (structures distinctes, question finale une fois sur trois au plus).
 */
import type { VariantKind } from "@/types/domain";
import type { Block, Segment, SegmentRole, Template } from "../types";

export interface CategoryCopy {
  categoryId: string;
  /** 1 à 3 banques d'accroches par variante (une par modèle, réutilisées si moins de 3). */
  hooks: Readonly<Record<VariantKind, readonly (readonly string[])[]>>;
  core: readonly string[];
  /** Bloc du corps principal : `Q` pour une citation reprise telle quelle. */
  coreBlock?: "B" | "Q";
  detail?: readonly string[];
  info?: readonly string[];
  context: readonly string[];
  story: readonly string[];
  closing: readonly string[];
  question?: readonly string[];
  quote?: readonly string[];
  /** Variables qui doivent apparaître dans le texte final quand elles sont renseignées (ex. le vainqueur). */
  mustMention?: readonly string[];
}

const segment = (
  block: Block,
  role: SegmentRole,
  options: readonly string[] | undefined,
  join = false,
): Segment | null => (options && options.length > 0 ? { block, role, options, join } : null);

/** Rôles rendus seulement à la demande du moteur. */
export const OPTIONAL_ROLES: readonly SegmentRole[] = ["closing", "question"];

function structureOf(segments: readonly Segment[]): string {
  const blocks: Block[] = [];
  for (const s of segments) {
    if (OPTIONAL_ROLES.includes(s.role) || s.join) continue;
    if (blocks.at(-1) === s.block && s.block !== "B") continue;
    blocks.push(s.block);
  }
  return blocks.join("-");
}

export function templatesFromCopy(copy: CategoryCopy): Template[] {
  const hook = (variant: VariantKind, n: number) => {
    const banks = copy.hooks[variant];
    return segment("H", "hook", banks[n % banks.length]);
  };
  const core = segment(copy.coreBlock ?? "B", "core", copy.core);
  const detail = (join: boolean) => segment("B", "detail", copy.detail, join);
  const info = segment("I", "info", copy.info);
  const context = segment("B", "context", copy.context);
  const story = segment("B", "story", copy.story);
  const closing = segment("B", "closing", copy.closing);
  const question = segment("B", "question", copy.question);
  const quote = segment("Q", "quote", copy.quote);
  const cta = segment("C", "cta", ["{cta}"]);
  const signature = segment("S", "signature", ["{signature}"]);
  const hashtags = segment("T", "hashtags", ["{hashtags}"]);

  const layouts: Record<VariantKind, (Segment | null)[][]> = {
    punchy: [
      [hook("punchy", 0), core, hashtags],
      [hook("punchy", 1), core, detail(true), hashtags],
      [hook("punchy", 2), core, hashtags],
    ],
    signature: [
      [hook("signature", 0), core, detail(true), info, closing, cta, signature, hashtags],
      [hook("signature", 1), info, core, closing, cta, signature, hashtags],
      [hook("signature", 2), core, info, detail(false), closing, cta, signature, hashtags],
    ],
    storytelling: [
      [hook("storytelling", 0), context, story, quote, closing, cta, signature, hashtags],
      [hook("storytelling", 1), context, core, story, closing, cta, signature, hashtags],
      [hook("storytelling", 2), core, story, quote, closing, question, cta, signature, hashtags],
    ],
  };

  return (Object.entries(layouts) as [VariantKind, (Segment | null)[][]][]).flatMap(
    ([variant, list]) =>
      list.map((raw, n) => {
        const segments = raw.filter((s): s is Segment => s !== null);
        return {
          id: `${copy.categoryId}.${variant}.${n + 1}`,
          categoryIds: [copy.categoryId],
          variant,
          structure: structureOf(segments),
          segments,
        };
      }),
  );
}
