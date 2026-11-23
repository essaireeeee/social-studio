/**
 * Catalogue des modèles du moteur natif : 9 par catégorie (3 par variante), soit 342.
 */
import { normalizeText } from "@/lib/editorial/text-utils";
import type { VariantKind } from "@/types/domain";
import type { Template } from "../types";
import { DAILY_EVENT_COPY, DAILY_SPORT_COPY } from "./daily";
import { templatesFromCopy, type CategoryCopy } from "./factory";
import { LIVE_COPY } from "./live";
import { COMMUNICATION_COPY, MEDIA_COPY } from "./media";

export const CATEGORY_COPY: readonly CategoryCopy[] = [
  ...LIVE_COPY,
  ...DAILY_SPORT_COPY,
  ...DAILY_EVENT_COPY,
  ...MEDIA_COPY,
  ...COMMUNICATION_COPY,
];

export const ALL_TEMPLATES: readonly Template[] = CATEGORY_COPY.flatMap(templatesFromCopy);

export function templatesFor(categoryId: string, variant: VariantKind): Template[] {
  return ALL_TEMPLATES.filter((t) => t.variant === variant && t.categoryIds.includes(categoryId));
}

export function copyFor(categoryId: string): CategoryCopy | undefined {
  return CATEGORY_COPY.find((copy) => copy.categoryId === categoryId);
}

/**
 * Mots du texte fixe des modèles (hors variables). Ce ne sont jamais des faits :
 * le Fact Guard ne les signale pas quand ils sont écrits en capitales.
 */
export const TEMPLATE_VOCABULARY: ReadonlySet<string> = new Set(
  ALL_TEMPLATES.flatMap((template) =>
    template.segments.flatMap((segment) =>
      segment.options.flatMap((option) =>
        normalizeText(option.replace(/\{[^}]+\}/g, " "))
          .split(/[^\p{L}\p{N}]+/u)
          .filter(Boolean),
      ),
    ),
  ),
);
