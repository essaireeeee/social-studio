/**
 * Session Live (section 12.3) : une seule session active à la fois, conservée en base
 * (elle survit à l'actualisation), archivée à la fin (`endedAt`). Tous les champs sauf le
 * nom de l'événement sont facultatifs. Aucune valeur n'est déduite : ce qui n'est pas
 * saisi ou présent dans la fiche événement reste vide.
 */
import { z } from "zod";
import type { DataRepository } from "@/lib/database/repository";
import { newId } from "@/lib/database/hash";
import { eventLabelOf } from "@/lib/generation/native/context";
import { IsoDateSchema, type HexEvent, type LiveSession } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || undefined);

export const LiveSessionInputSchema = z.object({
  eventId: z.string().optional(),
  eventName: z.string().trim().min(1, "Le nom de l'événement est obligatoire.").max(120),
  eventNumber: z
    .union([z.number(), z.string().trim()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === "") return undefined;
      const number = Number(value);
      if (!Number.isInteger(number) || number <= 0) {
        ctx.addIssue({ code: "custom", message: "Numéro : un entier positif." });
        return z.NEVER;
      }
      return number;
    }),
  venue: optionalText,
  city: optionalText,
  date: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(IsoDateSchema.optional()),
  broadcast: optionalText,
  ticketing: optionalText,
});
export type LiveSessionInput = z.input<typeof LiveSessionInputSchema>;
export type LiveSessionValues = z.output<typeof LiveSessionInputSchema>;

/** Pré-remplissage depuis une fiche événement : uniquement ce qu'elle contient. */
export function inputFromEvent(event: HexEvent): LiveSessionInput {
  return {
    eventId: event.id,
    eventName: event.name,
    eventNumber: event.number,
    venue: event.venue,
    city: event.city,
    date: event.date?.slice(0, 10),
    broadcast: event.broadcasters.find((b) => b.scope !== "prelims")?.name,
    ticketing: event.ticketingUrl,
  };
}

/** Champs de formulaire d'une session existante (modification). */
export function inputFromSession(session: LiveSession): LiveSessionInput {
  return {
    eventId: session.eventId,
    eventName: session.eventName,
    eventNumber: session.eventNumber,
    venue: session.venue,
    city: session.city,
    date: session.date?.slice(0, 10),
    broadcast: session.broadcast,
    ticketing: session.ticketing,
  };
}

/** Erreurs de validation par champ, en français. */
export function validateSessionInput(
  input: LiveSessionInput,
): { ok: true; values: LiveSessionValues } | { ok: false; errors: Record<string, string> } {
  const parsed = LiveSessionInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, values: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= field === "date" ? "Date invalide (AAAA-MM-JJ)." : issue.message;
  }
  return { ok: false, errors };
}

export async function activeSession(repository: DataRepository): Promise<LiveSession | undefined> {
  const sessions = await repository.liveSessions.list({ filter: (s) => s.active });
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

/** Archive toute session encore active. */
async function endActive(repository: DataRepository, now: Date): Promise<void> {
  const active = await repository.liveSessions.list({ filter: (s) => s.active });
  for (const session of active) {
    await repository.liveSessions.put({ ...session, active: false, endedAt: now.toISOString() });
  }
}

export async function startLiveSession(
  repository: DataRepository,
  values: LiveSessionValues,
  now = new Date(),
): Promise<LiveSession> {
  await endActive(repository, now);
  const session: LiveSession = {
    id: newId(),
    ...values,
    startedAt: now.toISOString(),
    active: true,
  };
  await repository.liveSessions.put(session);
  return session;
}

export async function updateLiveSession(
  repository: DataRepository,
  id: string,
  values: LiveSessionValues,
): Promise<LiveSession> {
  const current = await repository.liveSessions.get(id);
  if (!current) throw new Error("Session introuvable.");
  const session: LiveSession = {
    id: current.id,
    ...values,
    startedAt: current.startedAt,
    active: current.active,
    ...(current.endedAt ? { endedAt: current.endedAt } : {}),
  };
  await repository.liveSessions.put(session);
  return session;
}

export async function endLiveSession(
  repository: DataRepository,
  id: string,
  now = new Date(),
): Promise<void> {
  const current = await repository.liveSessions.get(id);
  if (!current || !current.active) return;
  await repository.liveSessions.put({ ...current, active: false, endedAt: now.toISOString() });
}

/** « HEXAGONE MMA 12 », « Paris », « Diffusion : RMC SPORT » : seulement les champs renseignés. */
export function sessionSummary(session: LiveSession): string[] {
  return [
    eventLabelOf(session.eventName, session.eventNumber),
    session.city,
    session.broadcast ? `Diffusion : ${session.broadcast}` : undefined,
  ].filter((part): part is string => Boolean(part));
}
