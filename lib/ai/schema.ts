/**
 * Schémas Zod de la couche IA (section 11.3) : sorties attendues des modèles et corps
 * des requêtes envoyées aux routes. Aucun champ ne porte de clé : elle voyage uniquement
 * dans l'en-tête `x-hex-provider-key`.
 */
import { z } from "zod";
import {
  BriefSchema,
  EditorialRuleSchema,
  EngineSchema,
  PlatformSchema,
  RefineActionSchema,
  VariantKindSchema,
} from "@/types/domain";

export const ProviderIdSchema = EngineSchema.exclude(["native"]);

// ---------------------------------------------------------------------------
// Sorties des modèles
// ---------------------------------------------------------------------------

/**
 * Forme envoyée au fournisseur comme sortie structurée. Les contraintes de cardinalité
 * ne sont pas toutes prises en charge par les fournisseurs : elles sont vérifiées après.
 */
export const VariantsWireSchema = z.object({
  variants: z.array(
    z.object({
      kind: VariantKindSchema,
      hook: z.string(),
      text: z.string(),
      usedFacts: z.array(z.string()),
    }),
  ),
});

/** Exactement trois variantes, une par type. */
export const VariantsOutputSchema = VariantsWireSchema.refine(
  (output) =>
    output.variants.length === 3 &&
    new Set(output.variants.map((v) => v.kind)).size === 3 &&
    output.variants.every((v) => v.text.trim() !== ""),
  { message: "Trois variantes attendues : punchy, signature, storytelling." },
);
export type VariantsOutput = z.infer<typeof VariantsOutputSchema>;

export const RefineOutputSchema = z.object({ text: z.string().min(1) });

export const DeclineOutputSchema = z.object({
  versions: z.array(z.object({ platform: PlatformSchema, text: z.string() })),
});

// ---------------------------------------------------------------------------
// Corps des requêtes
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().max(max);

/** Résumé du profil de style validé, calculé côté client (section 11.3). */
export const StyleSummarySchema = z.object({
  source: z.enum(["profile", "defaults"]),
  corpusSize: z.number().int().nonnegative(),
  confidence: z.enum(["insufficient", "low", "medium", "high"]).optional(),
  charsMedian: z.number().nonnegative(),
  charsP90: z.number().nonnegative(),
  linesMedian: z.number().nonnegative(),
  emojisPerPostMedian: z.number().nonnegative(),
  hashtagPosition: z.enum(["end", "inline", "mixed"]).default("end"),
  topEmojis: z
    .array(text(16))
    .max(20)
    .default(() => []),
  fingerprints: z
    .array(text(40))
    .max(10)
    .default(() => []),
  hookPatterns: z
    .array(text(200))
    .max(10)
    .default(() => []),
  ctas: z
    .array(text(300))
    .max(10)
    .default(() => []),
  overused: z
    .array(text(200))
    .max(30)
    .default(() => []),
});
export type StyleSummary = z.infer<typeof StyleSummarySchema>;

export const AiReferenceSchema = z.object({
  id: text(100),
  text: text(5000),
  categoryId: text(100).optional(),
  /** Date de publication (AAAA-MM-JJ). */
  date: text(40).optional(),
});
export type AiReference = z.infer<typeof AiReferenceSchema>;

/** Réglages du linter qui dépendent du poste du CM (préférences, profil, historique). */
export const LintOptionsSchema = z.object({
  frenchSpacing: z.boolean().default(true),
  emojiThreshold: z.number().int().positive().optional(),
  recentHooks: z
    .array(text(500))
    .max(20)
    .default(() => []),
});

const CommonRequestSchema = z.object({
  provider: ProviderIdSchema,
  brief: BriefSchema,
  /** Faits autorisés : brief, Session Live, fiches liées, événement, signature. */
  facts: z.array(text(2000)).max(300),
  rules: z.array(EditorialRuleSchema).max(200),
  hashtags: z
    .array(text(100))
    .max(30)
    .default(() => []),
  broadcasters: z
    .array(text(100))
    .max(30)
    .default(() => []),
  lint: LintOptionsSchema.prefault({}),
});

export const GenerateRequestSchema = CommonRequestSchema.extend({
  platform: PlatformSchema,
  references: z
    .array(AiReferenceSchema)
    .max(10)
    .default(() => []),
  styleProfileSummary: StyleSummarySchema,
  /** Signature rendue (champs requis présents), sinon absente. */
  signature: text(2000).optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const RefineRequestSchema = CommonRequestSchema.extend({
  action: RefineActionSchema,
  instruction: text(1000).optional(),
  text: text(10000).min(1),
  references: z
    .array(AiReferenceSchema)
    .max(10)
    .default(() => []),
  styleProfileSummary: StyleSummarySchema.optional(),
});
export type RefineRequest = z.infer<typeof RefineRequestSchema>;

export const DeclineRequestSchema = CommonRequestSchema.extend({
  text: text(10000).min(1),
  targets: z.array(PlatformSchema).min(1).max(4),
});
export type DeclineRequest = z.infer<typeof DeclineRequestSchema>;

export const TestRequestSchema = z.object({ provider: ProviderIdSchema });
