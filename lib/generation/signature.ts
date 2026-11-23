/**
 * Rendu des signatures (sections 6.4 et 15.3).
 * - Champs requis manquants : la signature n'est pas ajoutée (« Signature incomplète »).
 * - « Diffusion détaillée » : rendue seulement si les horaires de l'événement sont confirmés.
 * - Une ligne dont une variable est vide est supprimée du rendu.
 */
import { formatDayLabel } from "@/lib/format";
import type { HexEvent, LiveSession, Signature } from "@/types/domain";

export const SIGNATURE_VARIABLES = [
  "date",
  "venue",
  "city",
  "broadcaster",
  "prelimsTime",
  "prelimsChannel",
  "mainTime",
  "mainChannel",
  "ticketLink",
] as const;
export type SignatureVariable = (typeof SIGNATURE_VARIABLES)[number];
export type SignatureValues = Partial<Record<SignatureVariable, string>>;

/** Libellés des champs manquants, pour « Signature incomplète : date, salle manquantes ». */
export const SIGNATURE_FIELD_LABELS: Record<SignatureVariable, string> = {
  date: "date",
  venue: "salle",
  city: "ville",
  broadcaster: "diffuseur",
  prelimsTime: "horaire des préliminaires",
  prelimsChannel: "chaîne des préliminaires",
  mainTime: "horaire de la carte principale",
  mainChannel: "chaîne de la carte principale",
  ticketLink: "lien billetterie",
};

export interface SignatureSources {
  event?: HexEvent;
  liveSession?: LiveSession;
  /** Champs du brief (date, salle, ville, lien billetterie...) : prioritaires. */
  fields?: Readonly<Record<string, unknown>>;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Valeurs disponibles pour les variables de signature. Les horaires exigent `confirmedSchedule`. */
export function signatureValues({
  event,
  liveSession,
  fields = {},
}: SignatureSources): SignatureValues {
  const date = text(fields.date) ?? event?.date ?? liveSession?.date;
  const broadcasters = event?.broadcasters ?? [];
  const main = broadcasters.find((b) => b.scope === "main_card" || b.scope === "full");
  const prelims = broadcasters.find((b) => b.scope === "prelims");
  const confirmed = event?.confirmedSchedule === true;
  return {
    date: date ? formatDayLabel(date) : undefined,
    venue: text(fields.venue) ?? event?.venue ?? liveSession?.venue,
    city: text(fields.city) ?? event?.city ?? liveSession?.city,
    broadcaster: text(liveSession?.broadcast) ?? main?.name ?? broadcasters[0]?.name,
    prelimsTime: confirmed ? prelims?.startTime : undefined,
    prelimsChannel: confirmed ? (prelims?.channel ?? prelims?.name) : undefined,
    mainTime: confirmed ? main?.startTime : undefined,
    mainChannel: confirmed ? (main?.channel ?? main?.name) : undefined,
    ticketLink: text(fields.ticketLink) ?? event?.ticketingUrl ?? liveSession?.ticketing,
  };
}

export interface RenderedSignature {
  text?: string;
  /** Libellés des champs requis manquants. */
  missing: string[];
  /** Vrai si la signature exige des horaires confirmés et qu'ils ne le sont pas. */
  needsConfirmedSchedule: boolean;
}

const VARIABLE = /\{(\w+)\}/g;

export function renderSignature(
  signature: Pick<Signature, "template" | "requiredFields" | "requiresConfirmedSchedule">,
  values: SignatureValues,
  confirmedSchedule = false,
): RenderedSignature {
  const lookup = values as Record<string, string | undefined>;
  const missing = signature.requiredFields
    .filter((field) => !lookup[field])
    .map((field) => SIGNATURE_FIELD_LABELS[field as SignatureVariable] ?? field);
  const needsConfirmedSchedule = signature.requiresConfirmedSchedule && !confirmedSchedule;
  if (missing.length > 0 || needsConfirmedSchedule) return { missing, needsConfirmedSchedule };

  const lines = signature.template
    .split("\n")
    .filter((line) => [...line.matchAll(VARIABLE)].every(([, name]) => lookup[name!]))
    .map((line) => line.replace(VARIABLE, (_, name: string) => lookup[name] ?? ""));
  const rendered = lines.join("\n").trim();
  return { text: rendered || undefined, missing, needsConfirmedSchedule };
}
