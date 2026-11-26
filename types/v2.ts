/**
 * Types des tables ajoutées en V2 (schéma de base 2).
 * Chaque type est dérivé de son schéma Zod : le schéma fait foi.
 *
 * Sources : PROMPT_V2.md, sections 6.2-6.3 (Atelier Français), 7.1 (calendrier),
 * 8.1 (campagnes), 9.1 (suggestions), 9.3 (engagement) et 9.4 (actualité).
 */
import { z } from "zod";
import {
  BriefFieldValueSchema,
  CardPositionSchema,
  IsoDateSchema,
  MilestoneTypeSchema,
  ModeSchema,
  PlatformSchema,
} from "./domain";

const idSchema = z.string().min(1);

/**
 * Brief partiel, pour ouvrir le Studio pré-rempli. Volontairement sans valeurs
 * par défaut : un champ absent reste absent (pas de `fields: {}` ajouté en douce).
 */
export const BriefDraftSchema = z.object({
  mode: ModeSchema.optional(),
  categoryId: idSchema.optional(),
  platform: PlatformSchema.optional(),
  fields: z.record(z.string(), BriefFieldValueSchema.optional()).optional(),
  hashtagIds: z.array(idSchema).optional(),
  signatureId: idSchema.optional(),
  cta: z.string().optional(),
  liveSessionId: idSchema.optional(),
  freeInstruction: z.string().optional(),
});
export type BriefDraft = z.infer<typeof BriefDraftSchema>;

/** Heure locale « HH:mm » (paramètre de planification, jamais un horaire d'événement). */
const LocalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:mm)");

// ---------------------------------------------------------------------------
// Calendrier éditorial (section 7.1)
// ---------------------------------------------------------------------------

/** `event` : lecture seule, issu des fiches événements. */
export const CalendarItemTypeSchema = z.enum(["post", "reminder", "campaign_step", "event"]);
export const CalendarItemStatusSchema = z.enum([
  "idea",
  "to_confirm",
  "draft",
  "ready",
  "published",
  "missed",
  "cancelled",
]);
export const ContentFormatSchema = z.enum(["post", "carousel", "reel", "story", "video", "thread"]);

export type CalendarItemType = z.infer<typeof CalendarItemTypeSchema>;
export type CalendarItemStatus = z.infer<typeof CalendarItemStatusSchema>;
export type ContentFormat = z.infer<typeof ContentFormatSchema>;

export const CalendarItemSchema = z
  .object({
    id: idSchema,
    type: CalendarItemTypeSchema,
    status: CalendarItemStatusSchema,
    /** Ex. « Présentation de Jean Dupont ». */
    title: z.string().min(1),
    /** ISO UTC. Absent tant que l'élément est « À confirmer ». */
    scheduledAt: IsoDateSchema.optional(),
    allDay: z.boolean().default(false),
    platforms: z.array(PlatformSchema).default(() => []),
    format: ContentFormatSchema.optional(),
    mode: ModeSchema.optional(),
    categoryId: idSchema.optional(),
    briefDraft: BriefDraftSchema.optional(),
    /** Wording lié. */
    generationId: idSchema.optional(),
    /** Copie du texte validé au moment de la planification. */
    finalText: z.string().optional(),
    campaignId: idSchema.optional(),
    eventId: idSchema.optional(),
    fighterIds: z.array(idSchema).default(() => []),
    /** Récurrence RFC 5545 (ex. « FREQ=WEEKLY;BYDAY=WE »). */
    rrule: z.string().min(1).optional(),
    notes: z.string().optional(),
    color: z.string().optional(),
    publishedAt: IsoDateSchema.optional(),
    publishedUrl: z.url().optional(),
    createdAt: IsoDateSchema,
    updatedAt: IsoDateSchema,
  })
  .superRefine((item, ctx) => {
    // Règle 1.4 : une étape qui dépend d'une info manquante n'a pas de date.
    if (item.status === "to_confirm" && item.scheduledAt !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduledAt"],
        message: "Un élément « À confirmer » n'a pas de date.",
      });
    }
  });
export type CalendarItem = z.infer<typeof CalendarItemSchema>;

export const ReminderChannelSchema = z.enum(["in_app", "system"]);
export type ReminderChannel = z.infer<typeof ReminderChannelSchema>;

export const ReminderSchema = z.object({
  id: idSchema,
  calendarItemId: idSchema,
  /** Ex. -60 : une heure avant. */
  offsetMinutes: z.number().int(),
  /** Calculé à partir de `scheduledAt` et de `offsetMinutes`. */
  fireAt: IsoDateSchema,
  channels: z
    .array(ReminderChannelSchema)
    .min(1)
    .default(() => ["in_app" as const]),
  firedAt: IsoDateSchema.optional(),
  dismissedAt: IsoDateSchema.optional(),
  snoozedUntil: IsoDateSchema.optional(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

// ---------------------------------------------------------------------------
// Campagnes (section 8.1)
// ---------------------------------------------------------------------------

export const CampaignStatusSchema = z.enum(["draft", "active", "done", "archived"]);
export const CampaignSourceTypeSchema = z.enum(["generation", "wording", "fight"]);
export const CampaignIntensitySchema = z.enum(["light", "standard", "intense"]);
export const StorylineAngleTypeSchema = z.enum([
  "rivalry",
  "contrast",
  "redemption",
  "rise",
  "title_quest",
  "defense",
  "homecoming",
  "veteran_vs_prospect",
  "custom",
]);
export const CampaignPhaseSchema = z.enum([
  "announce",
  "build_up",
  "media",
  "fight_week",
  "fight_night",
  "aftermath",
]);
/** Information dont dépend une étape : sans elle, l'étape reste « À confirmer », sans date. */
export const StepDependencySchema = z.enum([...MilestoneTypeSchema.options, "fight_result"]);
export const CampaignStepStatusSchema = z.enum(["proposed", "accepted", "scheduled", "removed"]);
/** Qui a proposé l'étape : le plan natif ou l'enrichissement IA (section 8.7). */
export const StepOriginSchema = z.enum(["native", "ai"]);

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type CampaignSourceType = z.infer<typeof CampaignSourceTypeSchema>;
export type CampaignIntensity = z.infer<typeof CampaignIntensitySchema>;
export type StorylineAngleType = z.infer<typeof StorylineAngleTypeSchema>;
export type CampaignPhase = z.infer<typeof CampaignPhaseSchema>;
export type StepDependency = z.infer<typeof StepDependencySchema>;
export type CampaignStepStatus = z.infer<typeof CampaignStepStatusSchema>;

export const StorylineSchema = z.object({
  /** L'angle principal, en une phrase. */
  angle: z.string(),
  angleType: StorylineAngleTypeSchema,
  /** Uniquement des faits des fiches : `sourceRef` désigne le champ d'origine. */
  keyFacts: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1), sourceRef: idSchema }))
    .default(() => []),
  /** Fil rouge validé par le CM. */
  tagline: z.string().optional(),
  keywords: z.array(z.string()).default(() => []),
  avoid: z.array(z.string()).default(() => []),
  validated: z.boolean().default(false),
});
export type Storyline = z.infer<typeof StorylineSchema>;

export const CampaignStepSchema = z.object({
  id: idSchema,
  order: z.number().int().nonnegative(),
  phase: CampaignPhaseSchema,
  /** Ex. « Présentation de Jean Dupont ». */
  title: z.string().min(1),
  /** Ex. « Faire découvrir le parcours de Jean Dupont ». */
  objective: z.string(),
  /** J-n par rapport à l'événement (négatif avant, 0 le soir même). */
  relativeDay: z.number().int(),
  suggestedTime: LocalTimeSchema.optional(),
  dependsOn: StepDependencySchema.optional(),
  platforms: z.array(PlatformSchema).default(() => []),
  format: ContentFormatSchema.optional(),
  mode: ModeSchema,
  categoryId: idSchema,
  /** Angle propre à l'étape, lié au storyline. */
  angle: z.string(),
  briefDraft: BriefDraftSchema.prefault({}),
  status: CampaignStepStatusSchema.default("proposed"),
  proposedBy: StepOriginSchema.default("native"),
  calendarItemId: idSchema.optional(),
});
export type CampaignStep = z.infer<typeof CampaignStepSchema>;

export const CampaignSchema = z.object({
  id: idSchema,
  /** Ex. « Dupont vs Martin : HEXAGONE MMA 14 ». */
  name: z.string().min(1),
  status: CampaignStatusSchema,
  sourceType: CampaignSourceTypeSchema,
  sourceId: idSchema,
  eventId: idSchema.optional(),
  fighterIds: z.array(idSchema).default(() => []),
  cardPosition: CardPositionSchema,
  titleFight: z.boolean().default(false),
  intensity: CampaignIntensitySchema.default("standard"),
  storyline: StorylineSchema,
  steps: z.array(CampaignStepSchema).default(() => []),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Campaign = z.infer<typeof CampaignSchema>;

// ---------------------------------------------------------------------------
// Suggestions « Idées » (section 9.1)
// ---------------------------------------------------------------------------

export const SuggestionKindSchema = z.enum([
  "upcoming_event",
  "fighter_spotlight",
  "campaign_next",
  "calendar_gap",
  "ticketing_push",
  "media_relay",
  "anniversary",
  "result_followup",
  "unpublished_ready",
  "format_balance",
  "top_performer",
  "news_mention",
]);
export const SuggestionStatusSchema = z.enum(["new", "seen", "accepted", "snoozed", "dismissed"]);
export const SuggestionSourceTypeSchema = z.enum([
  "event",
  "fighter",
  "wording",
  "calendar",
  "campaign",
  "news",
  "history",
]);
export const SuggestionPrioritySchema = z.enum(["high", "medium", "low"]);

export type SuggestionKind = z.infer<typeof SuggestionKindSchema>;
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;
export type SuggestionPriority = z.infer<typeof SuggestionPrioritySchema>;

export const SuggestionSourceSchema = z.object({
  type: SuggestionSourceTypeSchema,
  id: idSchema,
  label: z.string().min(1),
  /** Lien externe (article d'actualité, post publié) : règle 1.4, toujours dire d'où. */
  url: z.url().optional(),
});
export type SuggestionSource = z.infer<typeof SuggestionSourceSchema>;

export const SuggestionSchema = z.object({
  id: idSchema,
  kind: SuggestionKindSchema,
  status: SuggestionStatusSchema.default("new"),
  /** Ex. « Présenter Jean Dupont avant HEXAGONE MMA 14 ». */
  title: z.string().min(1),
  /** Ex. « Combat dans 12 jours. Aucun post sur lui depuis 41 jours. » */
  why: z.string().min(1),
  sources: z.array(SuggestionSourceSchema).min(1),
  mode: ModeSchema,
  categoryId: idSchema,
  platforms: z.array(PlatformSchema).default(() => []),
  suggestedDate: IsoDateSchema.optional(),
  score: z.number().min(0).max(100),
  priority: SuggestionPrioritySchema,
  briefDraft: BriefDraftSchema.prefault({}),
  /** Empêche de reproposer la même idée. */
  dedupeKey: z.string().min(1),
  /** Motif choisi au rejet (« Pas pertinent », « Déjà fait »…), pour ajuster le score. */
  dismissReason: z.string().optional(),
  createdAt: IsoDateSchema,
  expiresAt: IsoDateSchema.optional(),
  snoozedUntil: IsoDateSchema.optional(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

// ---------------------------------------------------------------------------
// Atelier Français (sections 6.2 et 6.3)
// ---------------------------------------------------------------------------

export const FrenchRuleFamilySchema = z.enum([
  "homophones",
  "accords",
  "participe_passe",
  "conjugaison",
  "pluriels",
  "confusions",
  "majuscules",
  "typographie",
  "nombres",
  "pleonasmes",
  "syntaxe",
  "marque",
]);
export const FrenchLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const FrenchSeveritySchema = z.enum(["error", "warning", "suggestion"]);
/** `medium` : affiché « À vérifier ». */
export const FrenchConfidenceSchema = z.enum(["high", "medium"]);
/** Couche qui a produit l'alerte (section 6.1). */
export const FrenchLayerSchema = z.enum(["local", "languagetool", "ai"]);

export type FrenchRuleFamily = z.infer<typeof FrenchRuleFamilySchema>;
export type FrenchLevel = z.infer<typeof FrenchLevelSchema>;
export type FrenchSeverity = z.infer<typeof FrenchSeveritySchema>;
export type FrenchConfidence = z.infer<typeof FrenchConfidenceSchema>;
export type FrenchLayer = z.infer<typeof FrenchLayerSchema>;

/**
 * État enregistré d'une règle (activation par l'admin). La règle elle-même
 * (détection, explication, exemples) vit dans le code, `lib/french/rules`.
 */
export const FrenchRuleStateSchema = z.object({
  id: idSchema,
  family: FrenchRuleFamilySchema,
  level: FrenchLevelSchema,
  enabled: z.boolean(),
  updatedAt: IsoDateSchema,
});
export type FrenchRuleState = z.infer<typeof FrenchRuleStateSchema>;

export const FrenchDictionaryKindSchema = z.enum([
  "fighter",
  "event",
  "venue",
  "city",
  "broadcaster",
  "partner",
  "mma_lexicon",
  "anglicism",
  "custom",
]);
export type FrenchDictionaryKind = z.infer<typeof FrenchDictionaryKindSchema>;

export const FrenchDictionaryEntrySchema = z.object({
  id: idSchema,
  word: z.string().min(1),
  kind: FrenchDictionaryKindSchema,
  /** `auto` : tiré des fiches ; `lexicon` : lexique livré ; `cm` : ajouté à la main. */
  origin: z.enum(["auto", "lexicon", "cm"]),
  /** Fiche d'origine pour les entrées automatiques (combattant, événement). */
  sourceId: idSchema.optional(),
  /** Anglicismes : équivalent français proposé. Absent : terme accepté tel quel. */
  frenchEquivalent: z.string().min(1).optional(),
  createdAt: IsoDateSchema,
});
export type FrenchDictionaryEntry = z.infer<typeof FrenchDictionaryEntrySchema>;

/** Ce que le CM a fait de l'alerte. `open` : ni corrigée ni ignorée. */
export const FrenchResolutionSchema = z.enum([
  "open",
  "corrected",
  "ignored_here",
  "rule_disabled",
  "added_to_dictionary",
  "validated_anyway",
]);
export type FrenchResolution = z.infer<typeof FrenchResolutionSchema>;

/**
 * Journal des alertes (table `frenchIssues`). Alimente « Mes points faibles »
 * et l'entraînement. `author` permet d'exclure les sorties des moteurs.
 */
export const FrenchIssueRecordSchema = z.object({
  id: idSchema,
  ruleId: idSchema,
  family: FrenchRuleFamilySchema.optional(),
  layer: FrenchLayerSchema,
  severity: FrenchSeveritySchema,
  confidence: FrenchConfidenceSchema,
  /** Auteur du texte vérifié. */
  author: z.enum(["cm", "native", "ai"]),
  /** Passage signalé, tel qu'écrit. */
  excerpt: z.string().min(1),
  correction: z.string().optional(),
  resolution: FrenchResolutionSchema.default("open"),
  createdAt: IsoDateSchema,
});
export type FrenchIssueRecord = z.infer<typeof FrenchIssueRecordSchema>;

// ---------------------------------------------------------------------------
// Actualité et engagement (sections 9.3 et 9.4)
// ---------------------------------------------------------------------------

export const NewsSourceSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** Flux RSS ou Atom public, validé côté serveur (protection SSRF). */
  url: z.url(),
  enabled: z.boolean().default(true),
  lastFetchedAt: IsoDateSchema.optional(),
  lastError: z.string().optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type NewsSource = z.infer<typeof NewsSourceSchema>;

/** Titre et lien uniquement : aucune copie du contenu des articles (règle 1.4). */
export const NewsItemSchema = z.object({
  id: idSchema,
  sourceId: idSchema,
  title: z.string().min(1),
  url: z.url(),
  publishedAt: IsoDateSchema.optional(),
  fetchedAt: IsoDateSchema,
  matchedFighterIds: z.array(idSchema).default(() => []),
  matchedEventIds: z.array(idSchema).default(() => []),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

const countSchema = z.number().int().nonnegative().optional();

/** Statistiques d'un post publié, saisies ou importées par le CM. Jamais récupérées en ligne. */
export const EngagementSchema = z.object({
  id: idSchema,
  wordingId: idSchema,
  /** Date du relevé. */
  recordedAt: IsoDateSchema,
  likes: countSchema,
  comments: countSchema,
  shares: countSchema,
  saves: countSchema,
  views: countSchema,
  reach: countSchema,
  origin: z.enum(["manual", "csv"]).default("manual"),
});
export type Engagement = z.infer<typeof EngagementSchema>;
