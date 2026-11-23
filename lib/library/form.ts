/**
 * Fiche d'ajout et de modification d'une publication (section 14.2). Le texte est le seul
 * champ à saisir : la catégorie est proposée par le classifieur, les hashtags et le CTA
 * sont extraits du texte tant que le CM ne les a pas modifiés. Logique pure.
 */
import { categoryFieldKeys, getCategory, getField } from "@/lib/categories/registry";
import type { WordingInput } from "@/lib/database/wording-factory";
import { detectCta } from "@/lib/editorial/cta";
import { extractHashtags } from "@/lib/editorial/text-utils";
import { findEvent, findFighter } from "@/lib/generation/native/context";
import { fighterName } from "@/lib/studio/fighter-search";
import type { Classify } from "@/lib/import/classifier";
import type { Brief, Fighter, Generation, HexEvent, Mode, Platform, Wording } from "@/types/domain";

export interface WordingFormValues {
  text: string;
  mode: Mode;
  /** Vide tant qu'aucune catégorie n'est proposée ni choisie. */
  categoryId: string;
  /** Confiance de la proposition ; `null` si la catégorie a été choisie à la main. */
  confidence: number | null;
  modeTouched: boolean;
  categoryTouched: boolean;
  /** Noms affichés ; chaque nom doit correspondre à une fiche combattant. */
  fighters: string[];
  eventId: string;
  /** AAAA-MM-JJ ou vide. */
  date: string;
  platform: Platform;
  instagramUrl: string;
  /** Hashtags séparés par des espaces. */
  hashtags: string;
  hashtagsTouched: boolean;
  cta: string;
  ctaTouched: boolean;
  /** Tags séparés par des virgules. */
  tags: string;
  notes: string;
  status: Wording["status"];
}

export type FormField = "text" | "categoryId" | "fighters" | "instagramUrl" | "date";
export type FormErrors = Partial<Record<FormField, string>>;

export function emptyForm(mode: Mode): WordingFormValues {
  return {
    text: "",
    mode,
    categoryId: "",
    confidence: null,
    modeTouched: false,
    categoryTouched: false,
    fighters: [],
    eventId: "",
    date: "",
    platform: "instagram",
    instagramUrl: "",
    hashtags: "",
    hashtagsTouched: false,
    cta: "",
    ctaTouched: false,
    tags: "",
    notes: "",
    status: "published",
  };
}

/** Fiche remplie depuis une publication existante (modification ou duplication). */
export function formFromWording(wording: Wording, fighters: readonly Fighter[]): WordingFormValues {
  return {
    ...emptyForm(wording.mode),
    text: wording.text,
    categoryId: wording.categoryId,
    modeTouched: true,
    categoryTouched: true,
    fighters: wording.fighterIds.map((id) => {
      const fighter = fighters.find((f) => f.id === id);
      return fighter ? fighterName(fighter) : id;
    }),
    eventId: wording.eventId ?? "",
    date: wording.date?.slice(0, 10) ?? "",
    platform: wording.platform,
    instagramUrl: wording.instagramUrl ?? "",
    hashtags: wording.hashtags.join(" "),
    hashtagsTouched: true,
    cta: wording.cta ?? "",
    ctaTouched: true,
    tags: wording.tags.join(", "),
    notes: wording.internalNotes ?? "",
    status: wording.status,
  };
}

/** Combattants cités dans les champs du brief (noms tels que saisis). */
export function briefFighterNames(brief: Brief): string[] {
  const category = getCategory(brief.categoryId);
  if (!category) return [];
  return categoryFieldKeys(category)
    .filter((key) => getField(key).type === "fighter")
    .flatMap((key) => {
      const value = brief.fields[key];
      return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    })
    .filter(Boolean);
}

/**
 * Fiche pré-remplie depuis le Studio (statut `validated`) : texte final, mode, catégorie,
 * plateforme, combattants ayant une fiche, événement du brief, hashtags et CTA du texte.
 */
export function formFromGeneration(
  generation: Generation,
  text: string,
  sources: { fighters: readonly Fighter[]; events: readonly HexEvent[] },
): WordingFormValues {
  const { brief } = generation;
  const event = brief.fields.event;
  const fighters = briefFighterNames(brief)
    .map((name) => findFighter(name, sources.fighters))
    .filter((f): f is Fighter => Boolean(f));
  return {
    ...emptyForm(brief.mode),
    text,
    categoryId: brief.categoryId,
    modeTouched: true,
    categoryTouched: true,
    fighters: [...new Set(fighters.map(fighterName))],
    eventId: typeof event === "string" ? (findEvent(event, sources.events)?.id ?? "") : "",
    platform: brief.platform,
    hashtags: extractHashtags(text).join(" "),
    cta: detectCta(text) ?? "",
    status: "validated",
  };
}

/** Nouveau texte : propositions recalculées pour ce que le CM n'a pas touché. */
export function withText(
  values: WordingFormValues,
  text: string,
  classify: Classify,
): WordingFormValues {
  const next = { ...values, text };
  if (!values.hashtagsTouched) next.hashtags = extractHashtags(text).join(" ");
  if (!values.ctaTouched) next.cta = detectCta(text) ?? "";
  if (values.categoryTouched) return next;
  const guess = text.trim() ? classify(text) : undefined;
  const usable =
    guess?.categoryId && (!values.modeTouched || guess.mode === values.mode)
      ? guess.categoryId
      : "";
  next.categoryId = usable;
  next.confidence = usable ? guess!.confidence : null;
  if (!values.modeTouched && guess) next.mode = guess.mode;
  return next;
}

export function withMode(values: WordingFormValues, mode: Mode): WordingFormValues {
  const keep = getCategory(values.categoryId)?.mode === mode;
  return {
    ...values,
    mode,
    modeTouched: true,
    categoryId: keep ? values.categoryId : "",
    confidence: keep ? values.confidence : null,
  };
}

export function withCategory(values: WordingFormValues, categoryId: string): WordingFormValues {
  const category = getCategory(categoryId);
  if (!category) return { ...values, categoryId: "", categoryTouched: true, confidence: null };
  return { ...values, categoryId, mode: category.mode, categoryTouched: true, confidence: null };
}

export function parseHashtags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((tag) => tag.trim().replace(/^#*/, ""))
        .filter(Boolean)
        .map((tag) => `#${tag}`),
    ),
  ];
}

export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export function formErrors(values: WordingFormValues, fighters: readonly Fighter[]): FormErrors {
  const errors: FormErrors = {};
  if (!values.text.trim()) errors.text = "Le texte est requis.";
  if (!getCategory(values.categoryId)) {
    errors.categoryId = values.text.trim()
      ? "À catégoriser : choisissez une catégorie."
      : "Choisissez une catégorie.";
  }
  const unknown = values.fighters.filter((name) => !findFighter(name, fighters));
  if (unknown.length > 0) {
    errors.fighters = `Fiche introuvable : ${unknown.join(", ")}. Créez-la depuis la liste des suggestions.`;
  }
  if (values.instagramUrl && !/^https?:\/\/\S+$/.test(values.instagramUrl.trim())) {
    errors.instagramUrl = "Le lien doit commencer par http:// ou https://.";
  }
  if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    errors.date = "Date attendue au format AAAA-MM-JJ.";
  }
  return errors;
}

/** Données à enregistrer (la source et l'identifiant sont décidés par l'appelant). */
export function inputFromForm(
  values: WordingFormValues,
  fighters: readonly Fighter[],
): Omit<WordingInput, "source"> {
  const text = values.text.trim();
  return {
    text,
    mode: values.mode,
    categoryId: values.categoryId,
    platform: values.platform,
    status: values.status,
    fighterIds: [
      ...new Set(
        values.fighters
          .map((name) => findFighter(name, fighters)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ],
    eventId: values.eventId || undefined,
    date: values.date || undefined,
    instagramUrl: values.instagramUrl.trim() || undefined,
    hashtags: parseHashtags(values.hashtags),
    cta: values.cta.trim() || undefined,
    tags: parseTags(values.tags),
    internalNotes: values.notes.trim() || undefined,
  };
}
