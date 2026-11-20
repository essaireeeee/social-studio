/**
 * Types de domaine partagés client / serveur.
 * Chaque type est dérivé de son schéma Zod (`z.infer`) : le schéma fait foi.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const APP_ID = "hexagone-social-studio" as const;
export const DEFAULT_USER_ID = "user-default";

const idSchema = z.string().min(1);

/** Date ou date-heure ISO 8601 (« 2026-03-14 » ou « 2026-03-14T20:30:00.000Z »). */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/, "Date ISO attendue")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Date invalide");

export const ModeSchema = z.enum(["live", "daily"]);
export const PlatformSchema = z.enum(["instagram", "facebook", "x", "tiktok"]);
export const ContentStatusSchema = z.enum(["generated", "edited", "validated", "published"]);
export const SourceSchema = z.enum([
  "manual",
  "bulk",
  "csv",
  "excel",
  "instagram_export",
  "studio",
  "demo",
]);
export const EngineSchema = z.enum(["native", "anthropic", "openai"]);
export const RevisionOriginSchema = z.enum(["native", "anthropic", "openai", "cm_edit"]);
export const RefineActionSchema = z.enum([
  "shorten",
  "punchier",
  "institutional",
  "new_hook",
  "toggle_emojis",
  "rephrase",
  "regenerate",
  "custom",
]);
/** Action ayant produit une révision : une retouche, ou le retour à une révision antérieure. */
export const RevisionActionSchema = z.enum([...RefineActionSchema.options, "restore"]);
export const VariantKindSchema = z.enum(["punchy", "signature", "storytelling"]);
export const GenerationStatusSchema = z.enum(["draft", "editing", "validated", "published"]);
export const UserRoleSchema = z.enum(["cm", "admin"]);

export type Mode = z.infer<typeof ModeSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Engine = z.infer<typeof EngineSchema>;
export type RevisionOrigin = z.infer<typeof RevisionOriginSchema>;
export type RefineAction = z.infer<typeof RefineActionSchema>;
export type RevisionAction = z.infer<typeof RevisionActionSchema>;
export type VariantKind = z.infer<typeof VariantKindSchema>;
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

// ---------------------------------------------------------------------------
// Bibliothèque
// ---------------------------------------------------------------------------

/** Une publication de la bibliothèque. Elle ne contient que du validé ou du publié. */
export const WordingSchema = z.object({
  id: idSchema,
  text: z.string().min(1),
  /** Minuscules, sans accents, sans emojis, espaces compactés. */
  textNormalized: z.string(),
  /** SHA-256 (hexadécimal) de `textNormalized`, pour les doublons exacts. */
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  mode: ModeSchema,
  categoryId: idSchema,
  platform: PlatformSchema,
  fighterIds: z.array(idSchema).default(() => []),
  eventId: idSchema.optional(),
  /** Date de publication. */
  date: IsoDateSchema.optional(),
  /** Stockée, jamais récupérée automatiquement. */
  instagramUrl: z.url().optional(),
  hashtags: z.array(z.string()).default(() => []),
  emojis: z.array(z.string()).default(() => []),
  cta: z.string().optional(),
  tags: z.array(z.string()).default(() => []),
  internalNotes: z.string().optional(),
  status: z.enum(["validated", "published"]),
  source: SourceSchema,
  isDemo: z.boolean(),
  /** Utilisable comme référence de style (vrai par défaut, sauf pour les démos). */
  isReference: z.boolean(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Wording = z.infer<typeof WordingSchema>;

// ---------------------------------------------------------------------------
// Combattants et événements
// ---------------------------------------------------------------------------

export const FightResultSchema = z.enum(["W", "L", "D", "NC"]);

export const FighterSchema = z.object({
  id: idSchema,
  firstName: z.string(),
  lastName: z.string().min(1),
  nickname: z.string().optional(),
  nationality: z.string().optional(),
  weightClass: z.string().optional(),
  club: z.string().optional(),
  /** Palmarès daté : `asOf` indique la date à laquelle il était exact. */
  record: z
    .object({
      wins: z.number().int().nonnegative(),
      losses: z.number().int().nonnegative(),
      draws: z.number().int().nonnegative(),
      nc: z.number().int().nonnegative().optional(),
      asOf: IsoDateSchema,
    })
    .optional(),
  bio: z.string().optional(),
  fightHistory: z
    .array(
      z.object({
        date: IsoDateSchema,
        opponent: z.string().min(1),
        result: FightResultSchema,
        method: z.string().optional(),
        eventId: idSchema.optional(),
      }),
    )
    .default(() => []),
  /** Consignes de rédaction propres au combattant (ex. règle Samba Sima). */
  editorialNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  updatedAt: IsoDateSchema,
});
export type Fighter = z.infer<typeof FighterSchema>;

export const BroadcasterScopeSchema = z.enum(["prelims", "main_card", "full"]);
export const CardPositionSchema = z.enum(["main", "co-main", "card", "prelim"]);

export const HexEventSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  number: z.number().int().positive().optional(),
  date: IsoDateSchema.optional(),
  city: z.string().optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
  ticketingUrl: z.url().optional(),
  links: z.array(z.object({ label: z.string().min(1), url: z.url() })).default(() => []),
  broadcasters: z
    .array(
      z.object({
        name: z.string().min(1),
        channel: z.string().optional(),
        startTime: z.string().optional(),
        scope: BroadcasterScopeSchema.optional(),
      }),
    )
    .default(() => []),
  /** Faux : aucun horaire n'est injecté dans les textes. */
  confirmedSchedule: z.boolean().default(false),
  fightCard: z
    .array(
      z.object({
        fighterAId: idSchema,
        fighterBId: idSchema,
        weightClass: z.string().optional(),
        position: CardPositionSchema,
        title: z.boolean().optional(),
      }),
    )
    .default(() => []),
  notes: z.string().optional(),
  updatedAt: IsoDateSchema,
});
export type HexEvent = z.infer<typeof HexEventSchema>;

export const LiveSessionSchema = z.object({
  id: idSchema,
  eventId: idSchema.optional(),
  eventName: z.string().min(1),
  eventNumber: z.number().int().positive().optional(),
  venue: z.string().optional(),
  city: z.string().optional(),
  date: IsoDateSchema.optional(),
  broadcast: z.string().optional(),
  ticketing: z.string().optional(),
  startedAt: IsoDateSchema,
  endedAt: IsoDateSchema.optional(),
  active: z.boolean(),
});
export type LiveSession = z.infer<typeof LiveSessionSchema>;

// ---------------------------------------------------------------------------
// Studio : brief, variantes, révisions, générations
// ---------------------------------------------------------------------------

/** Valeur d'un champ de brief. Les listes servent aux sélections multiples (fight card, combattants). */
export const BriefFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export type BriefFieldValue = z.infer<typeof BriefFieldValueSchema>;

export const BriefSchema = z.object({
  mode: ModeSchema,
  categoryId: idSchema,
  platform: PlatformSchema,
  fields: z.record(z.string(), BriefFieldValueSchema.optional()).default(() => ({})),
  hashtagIds: z.array(idSchema).default(() => []),
  signatureId: idSchema.optional(),
  cta: z.string().optional(),
  liveSessionId: idSchema.optional(),
  freeInstruction: z.string().optional(),
});
export type Brief = z.infer<typeof BriefSchema>;

/** Élément du texte absent des faits autorisés (Fact Guard, Phase 5). */
export const FactWarningSchema = z.object({
  kind: z.enum(["number", "time", "date", "proper_noun", "broadcaster", "price", "other"]),
  value: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type FactWarning = z.infer<typeof FactWarningSchema>;

export const RevisionSchema = z.object({
  id: idSchema,
  text: z.string(),
  createdAt: IsoDateSchema,
  origin: RevisionOriginSchema,
  action: RevisionActionSchema.optional(),
  instruction: z.string().optional(),
  factWarnings: z.array(FactWarningSchema).default(() => []),
});
export type Revision = z.infer<typeof RevisionSchema>;

export const VariantSchema = z.object({
  id: idSchema,
  kind: VariantKindSchema,
  /** La dernière révision est la courante. Rien n'est jamais écrasé. */
  revisions: z.array(RevisionSchema).min(1),
  selected: z.boolean(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const GenerationSchema = z.object({
  id: idSchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
  brief: BriefSchema,
  engine: EngineSchema,
  fallbackReason: z.string().optional(),
  /** Références réellement utilisées. */
  referenceIds: z.array(idSchema).default(() => []),
  variants: z.array(VariantSchema),
  finalText: z.string().optional(),
  finalPlatform: PlatformSchema.optional(),
  status: GenerationStatusSchema,
  savedToLibraryId: idSchema.optional(),
  declinations: z.partialRecord(PlatformSchema, z.string()).optional(),
});
export type Generation = z.infer<typeof GenerationSchema>;

// ---------------------------------------------------------------------------
// Hashtags, signatures, règles éditoriales
// ---------------------------------------------------------------------------

export const HashtagGroupSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: z.enum(["official", "mma_france", "event", "fighter", "campaign"]),
  tags: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u, "Hashtag invalide")),
  defaultOn: z.boolean(),
  modes: z.array(ModeSchema).min(1),
  /** Position dans la liste (réordonnable, section 15.3). */
  order: z.number().int().default(0),
});
export type HashtagGroup = z.infer<typeof HashtagGroupSchema>;

export const SignatureSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** Gabarit multiligne avec variables `{date}`, `{venue}`... Une ligne dont une variable est vide n'est pas rendue. */
  template: z.string().min(1),
  /** Variables sans lesquelles la signature entière n'est pas ajoutée. */
  requiredFields: z.array(z.string()).default(() => []),
  /** Vrai : rendue seulement si l'événement a des horaires confirmés. */
  requiresConfirmedSchedule: z.boolean().default(false),
  modes: z.array(ModeSchema).min(1),
  enabled: z.boolean(),
  order: z.number().int().default(0),
});
export type Signature = z.infer<typeof SignatureSchema>;

export const EditorialRuleSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  kind: z.enum(["replace", "forbid", "require", "contextual"]),
  pattern: z.string().optional(),
  flags: z.string().optional(),
  replacement: z.string().optional(),
  /** Liste éditable associée à la règle (formules interdites, qualificatifs, catégories...). */
  values: z.array(z.string()).optional(),
  enabled: z.boolean(),
  editableBy: z.literal("admin"),
});
export type EditorialRule = z.infer<typeof EditorialRuleSchema>;

// ---------------------------------------------------------------------------
// Profil de style (section 8.3, calculé en Phase 3)
// ---------------------------------------------------------------------------

export const NgramSchema = z.object({
  text: z.string(),
  count: z.number().int().nonnegative(),
  /** Part des posts du corpus qui contiennent l'expression (0 à 1). */
  share: z.number().min(0).max(1),
});
export type Ngram = z.infer<typeof NgramSchema>;

const countedText = (key: "emoji" | "tag" | "text" | "word" | "pattern") =>
  z.object({ [key]: z.string(), count: z.number().int().nonnegative() });

export const StyleProfileSchema = z.object({
  id: idSchema,
  mode: ModeSchema,
  createdAt: IsoDateSchema,
  corpusSize: z.number().int().nonnegative(),
  corpusIds: z.array(idSchema),
  /** Les exemples fictifs ont-ils été inclus dans l'analyse (option explicite) ? */
  includesDemo: z.boolean().default(false),
  /** <5 | 5-14 | 15-49 | ≥50 posts */
  confidence: z.enum(["insufficient", "low", "medium", "high"]),
  status: z.enum(["proposed", "validated"]),
  validatedBy: idSchema.optional(),
  validatedAt: IsoDateSchema.optional(),
  length: z.object({
    charsMean: z.number(),
    charsMedian: z.number(),
    charsP90: z.number(),
    linesMedian: z.number(),
    paragraphsMedian: z.number(),
  }),
  emojis: z.object({
    top: z.array(
      z.object({ emoji: z.string(), count: z.number().int(), share: z.number().min(0).max(1) }),
    ),
    perPostMedian: z.number(),
    perPostP90: z.number(),
    /** Part des lignes qui commencent par un emoji. */
    lineStartRatio: z.number().min(0).max(1),
  }),
  hashtags: z.object({
    top: z.array(countedText("tag")),
    perPostMedian: z.number(),
    position: z.enum(["end", "inline", "mixed"]),
  }),
  hooks: z.object({
    /** Premières lignes réelles, pour consultation uniquement. */
    samples: z.array(z.string()),
    patterns: z.array(countedText("pattern")),
    uppercaseRatio: z.number().min(0).max(1),
    exclamationRatio: z.number().min(0).max(1),
    questionRatio: z.number().min(0).max(1),
    avgWords: z.number(),
  }),
  ctas: z.object({ top: z.array(countedText("text")) }),
  ngrams: z.object({
    bigrams: z.array(NgramSchema),
    trigrams: z.array(NgramSchema),
    quadgrams: z.array(NgramSchema),
  }),
  vocabulary: z.object({ top: z.array(countedText("word")) }),
  structures: z.array(
    z.object({
      fingerprint: z.string(),
      count: z.number().int(),
      categoryId: idSchema.optional(),
    }),
  ),
  overused: z.array(z.object({ expression: z.string(), share: z.number().min(0).max(1) })),
  punctuation: z.object({
    exclamationPerPost: z.number(),
    ellipsisPerPost: z.number(),
    uppercaseWordRatio: z.number().min(0).max(1),
  }),
});
export type StyleProfile = z.infer<typeof StyleProfileSchema>;

// ---------------------------------------------------------------------------
// Utilisateurs, fichiers, réglages
// ---------------------------------------------------------------------------

export const UserProfileSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  role: UserRoleSchema,
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

/** Image (logo, visuel d'aperçu) stockée en base64 pour rester sérialisable dans les sauvegardes JSON. */
export const BlobRecordSchema = z.object({
  id: idSchema,
  kind: z.enum(["logo", "preview_image"]),
  mimeType: z.string().regex(/^image\/[\w.+-]+$/),
  data: z.base64(),
  size: z.number().int().nonnegative(),
  updatedAt: IsoDateSchema,
});
export type BlobRecord = z.infer<typeof BlobRecordSchema>;

export const RetrievalWeightsSchema = z.object({
  sameCategory: z.number().default(0.3),
  fighterOverlap: z.number().default(0.2),
  sameEvent: z.number().default(0.1),
  textSimilarity: z.number().default(0.25),
  samePlatform: z.number().default(0.1),
  recency: z.number().default(0.05),
  usedRecently: z.number().default(0.15),
});
export type RetrievalWeights = z.infer<typeof RetrievalWeightsSchema>;

/**
 * Réglages de l'application. Chaque champ a une valeur par défaut :
 * `SettingsSchema.parse({})` donne une configuration complète.
 * Ne contient jamais de clé API (règle 1.5).
 */
export const SettingsSchema = z.object({
  quickOptions: z
    .object({
      rounds: z.array(z.string()).default(() => ["R1", "R2", "R3", "R4", "R5"]),
      methods: z.array(z.string()).default(() => ["KO", "TKO", "Soumission", "Décision"]),
      broadcasters: z
        .array(z.string())
        .default(() => ["RMC SPORT", "DAZN", "YouTube", "Autre", "Aucun"]),
    })
    .prefault({}),
  igTruncation: z.number().int().min(60).max(300).default(125),
  fbTruncation: z.number().int().min(100).max(2000).default(480),
  accountName: z.string().min(1).default("hexagonemma"),
  activeUserId: idSchema.default(DEFAULT_USER_ID),
  aiProvider: EngineSchema.default("native"),
  variantOrder: z
    .array(VariantKindSchema)
    .length(3)
    .default((): VariantKind[] => ["signature", "punchy", "storytelling"]),
  /** Espace insécable avant ! ? : ; (typographie française). */
  frenchSpacing: z.boolean().default(true),
  copyShortcut: z.enum(["mod+shift+c", "mod+alt+c"]).default("mod+shift+c"),
  retrievalWeights: RetrievalWeightsSchema.prefault({}),
  lastMode: ModeSchema.default("live"),
});
export type Settings = z.infer<typeof SettingsSchema>;
