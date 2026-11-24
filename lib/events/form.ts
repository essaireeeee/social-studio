/**
 * Fiche événement (section 15.2) : valeurs du formulaire, contrôles et conversion en
 * `HexEvent`. Sans « Horaires confirmés », aucun horaire n'est injecté dans les textes
 * (règle appliquée par `signatureValues` et le Context Builder). Logique pure.
 */
import { isValidClockTime } from "@/lib/categories/registry";
import { HexEventSchema, type HexEvent } from "@/types/domain";
import { cardErrors, fightCardOf, slotsFromEvent, type FightSlot } from "./fight-card";

export type BroadcastScope = NonNullable<HexEvent["broadcasters"][number]["scope"]>;

export const SCOPE_LABELS: Record<BroadcastScope, string> = {
  prelims: "Préliminaires",
  main_card: "Carte principale",
  full: "Toute la soirée",
};

export interface BroadcasterRow {
  key: string;
  name: string;
  channel: string;
  startTime: string;
  scope: BroadcastScope;
}

export interface LinkRow {
  key: string;
  label: string;
  url: string;
}

export interface EventFormValues {
  name: string;
  number: string;
  date: string;
  city: string;
  venue: string;
  address: string;
  ticketingUrl: string;
  links: LinkRow[];
  broadcasters: BroadcasterRow[];
  confirmedSchedule: boolean;
  fightCard: FightSlot[];
  notes: string;
}

export type EventFormErrors = Record<string, string>;

let counter = 0;
const key = (prefix: string) => `${prefix}-${(counter += 1)}`;

export const newBroadcaster = (row: Partial<BroadcasterRow> = {}): BroadcasterRow => ({
  key: key("broadcast"),
  name: "",
  channel: "",
  startTime: "",
  scope: "full",
  ...row,
});

export const newLink = (row: Partial<LinkRow> = {}): LinkRow => ({
  key: key("link"),
  label: "",
  url: "",
  ...row,
});

export function eventForm(event?: HexEvent): EventFormValues {
  return {
    name: event?.name ?? "HEXAGONE MMA",
    number: event?.number ? String(event.number) : "",
    date: event?.date?.slice(0, 10) ?? "",
    city: event?.city ?? "",
    venue: event?.venue ?? "",
    address: event?.address ?? "",
    ticketingUrl: event?.ticketingUrl ?? "",
    links: (event?.links ?? []).map((l) => newLink(l)),
    broadcasters: (event?.broadcasters ?? []).map((b) =>
      newBroadcaster({
        name: b.name,
        channel: b.channel ?? "",
        startTime: b.startTime ?? "",
        scope: b.scope ?? "full",
      }),
    ),
    confirmedSchedule: event?.confirmedSchedule ?? false,
    fightCard: slotsFromEvent(event),
    notes: event?.notes ?? "",
  };
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function eventFormErrors(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};
  if (!values.name.trim()) errors.name = "Le nom est requis.";
  if (values.number.trim() && !/^[1-9]\d{0,3}$/.test(values.number.trim())) {
    errors.number = "Numéro entier positif attendu.";
  }
  if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) errors.date = "Date invalide.";
  if (values.ticketingUrl.trim() && !isUrl(values.ticketingUrl.trim())) {
    errors.ticketingUrl = "Le lien doit commencer par http:// ou https://.";
  }
  for (const link of values.links) {
    if (!link.label.trim()) errors[`${link.key}-label`] = "Libellé requis.";
    if (!isUrl(link.url.trim())) errors[`${link.key}-url`] = "Lien invalide.";
  }
  for (const b of values.broadcasters) {
    if (!b.name.trim()) errors[`${b.key}-name`] = "Nom du diffuseur requis.";
    if (b.startTime.trim() && !isValidClockTime(b.startTime)) {
      errors[`${b.key}-startTime`] = "Horaire attendu au format 20h30.";
    }
  }
  return { ...errors, ...cardErrors(values.fightCard) };
}

/** Avertissement non bloquant : horaires confirmés sans aucun horaire saisi. */
export function scheduleWarning(values: EventFormValues): string | undefined {
  if (values.confirmedSchedule && !values.broadcasters.some((b) => b.startTime.trim())) {
    return "Horaires confirmés, mais aucun horaire n'est saisi pour les diffuseurs.";
  }
  return undefined;
}

const opt = (value: string) => value.trim() || undefined;

export function eventFromForm(
  values: EventFormValues,
  options: { id: string; now: Date },
): HexEvent {
  return HexEventSchema.parse({
    id: options.id,
    name: values.name.trim(),
    number: values.number.trim() ? Number(values.number) : undefined,
    date: opt(values.date),
    city: opt(values.city),
    venue: opt(values.venue),
    address: opt(values.address),
    ticketingUrl: opt(values.ticketingUrl),
    links: values.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    broadcasters: values.broadcasters.map((b) => ({
      name: b.name.trim(),
      channel: opt(b.channel),
      startTime: opt(b.startTime),
      scope: b.scope,
    })),
    confirmedSchedule: values.confirmedSchedule,
    fightCard: fightCardOf(values.fightCard),
    notes: opt(values.notes),
    updatedAt: options.now.toISOString(),
  });
}
