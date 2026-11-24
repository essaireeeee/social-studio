/**
 * Context builder (section 10.2) : transforme le brief et les données liées en variables
 * de modèle, et liste les faits autorisés pour le Fact Guard. Rien n'est inventé : une
 * variable n'existe que si sa source est renseignée. Logique pure.
 */
import { categoryFieldKeys, getField, type CategoryDef } from "@/lib/categories/registry";
import { normalizeText } from "@/lib/editorial/text-utils";
import { formatDate, formatDayLabel } from "@/lib/format";
import type { Brief, BriefFieldValue, Fighter, HexEvent, LiveSession } from "@/types/domain";
import type { VariableMap } from "./types";

export interface FactSources {
  fighters: readonly Fighter[];
  event?: HexEvent;
  liveSession?: LiveSession;
  hashtags: readonly string[];
  signatureText?: string;
  cta?: string;
}

export interface BriefContext {
  vars: VariableMap;
  /** Faits autorisés : brief, session, fiches liées, événement, signature, hashtags. */
  facts: string[];
  /** Fiches combattants reliées au brief. */
  linkedFighters: Fighter[];
}

const asText = (value: BriefFieldValue | undefined): string | undefined =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : typeof value === "number"
      ? String(value)
      : undefined;

const fullName = (f: Fighter) => `${f.firstName} ${f.lastName}`.trim();

export function findFighter(value: string, fighters: readonly Fighter[]): Fighter | undefined {
  const needle = normalizeText(value);
  return fighters.find(
    (f) =>
      f.id === value ||
      [fullName(f), f.nickname ?? ""].some((n) => n && normalizeText(n) === needle),
  );
}

export function findEvent(value: string, events: readonly HexEvent[]): HexEvent | undefined {
  const needle = normalizeText(value);
  return events.find(
    (e) =>
      e.id === value ||
      normalizeText(e.name) === needle ||
      (e.number !== undefined && normalizeText(`${e.name} ${e.number}`) === needle),
  );
}

export const eventLabelOf = (name: string, number?: number) =>
  number ? `${name} ${number}` : name;

/** « Karim, Tom et Ali » */
export function frenchList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`;
}

const ordinal = (n: number, feminine = false) => (n === 1 ? (feminine ? "1re" : "1er") : `${n}e`);

const METHOD_LABELS: Record<string, string> = {
  KO: "KO",
  TKO: "TKO",
  Soumission: "soumission",
  Décision: "décision",
};

function firstSentence(text: string): string {
  const match = /^.*?[.!?](?=\s|$)/su.exec(text.trim());
  return (match?.[0] ?? text).trim();
}

export function buildBriefContext(
  brief: Brief,
  category: CategoryDef,
  sources: FactSources & { events?: readonly HexEvent[] },
): BriefContext {
  const vars: Record<string, string> = {};
  const facts: string[] = [];
  const linkedFighters: Fighter[] = [];
  const set = (key: string, value: string | undefined) => {
    if (value && value.trim()) vars[key] = value.trim();
  };
  const fields: Record<string, BriefFieldValue | undefined> = {
    ...category.presets,
    ...brief.fields,
  };

  // Valeurs brutes du brief : toutes sont des faits.
  for (const value of Object.values(fields)) {
    if (Array.isArray(value)) facts.push(...value);
    else if (typeof value === "string" || typeof value === "number") facts.push(String(value));
  }

  // Champs du formulaire.
  let event: HexEvent | undefined = sources.event;
  for (const key of [...categoryFieldKeys(category), ...Object.keys(category.presets ?? {})]) {
    const def = getField(key);
    const value = fields[key];
    if (def.type === "fighter") {
      const values = Array.isArray(value) ? value : asText(value) ? [asText(value)!] : [];
      const names = values.map((raw) => {
        const fiche = findFighter(raw, sources.fighters);
        if (fiche && !linkedFighters.includes(fiche)) linkedFighters.push(fiche);
        return { raw, fiche, display: fiche ? fullName(fiche) : raw };
      });
      if (def.multiple) {
        set(`${key}List`, frenchList(names.map((n) => n.display)));
        continue;
      }
      const first = names[0];
      if (!first) continue;
      set(key, first.display);
      set(`${key}Short`, first.fiche?.lastName ?? first.display);
      set(`${key}Nickname`, first.fiche?.nickname);
      if (first.fiche) {
        set(`${key}WeightClass`, first.fiche.weightClass);
        set(`${key}Club`, first.fiche.club);
        if (first.fiche.bio) set(`${key}Bio`, firstSentence(first.fiche.bio));
        const record = first.fiche.record;
        // Palmarès : seulement si le CM coche « Utiliser le palmarès » (section 15.1).
        if (record && fields.useRecord === true) {
          const figures = `${record.wins}-${record.losses}-${record.draws}`;
          set(`${key}Record`, figures);
          // Formulation datée, en interne seulement : le texte n'affiche que le chiffre.
          facts.push(
            `Palmarès de ${fullName(first.fiche)} au ${formatDate(record.asOf)} : ${figures}`,
          );
        }
      }
    } else if (def.type === "event") {
      const text = asText(value);
      if (!text) continue;
      event = sources.events ? (findEvent(text, sources.events) ?? event) : event;
      set("eventLabel", event ? eventLabelOf(event.name, event.number) : text);
    } else if (def.type === "chips" && def.multiple && Array.isArray(value)) {
      set(`${key}List`, value.join("\n"));
    } else if (def.type !== "toggle") {
      set(key, asText(value));
    }
  }

  // Contexte événement : fiche, puis Session Live en mode LIVE.
  const session = brief.mode === "live" ? sources.liveSession : undefined;
  if (!vars.eventLabel) {
    if (event) set("eventLabel", eventLabelOf(event.name, event.number));
    else if (session) set("eventLabel", eventLabelOf(session.eventName, session.eventNumber));
  }
  const date = asText(fields.date) ?? event?.date ?? session?.date;
  if (date) set("dateLabel", formatDayLabel(date));
  set("venue", asText(fields.venue) ?? event?.venue ?? session?.venue);
  set("city", asText(fields.city) ?? event?.city ?? session?.city);
  set(
    "broadcast",
    session?.broadcast ?? event?.broadcasters.find((b) => b.scope !== "prelims")?.name,
  );
  set("ticketLink", asText(fields.ticketLink) ?? event?.ticketingUrl ?? session?.ticketing);

  // Combattant perdant déduit du vainqueur (résultat entre deux combattants saisis).
  if (!vars.loser && vars.winner && vars.fighter1 && vars.fighter2) {
    const other = [vars.fighter1, vars.fighter2].find((name) => name !== vars.winner);
    set("loser", other);
    if (other) set("loserShort", vars.fighter1 === other ? vars.fighter1Short : vars.fighter2Short);
  }

  // Méthode, round, décision.
  const method = asText(fields.method);
  if (method) set("methodLabel", METHOD_LABELS[method] ?? method.toLowerCase());
  const decisionType = asText(fields.decisionType);
  if (decisionType) set("decisionLabel", `décision ${decisionType.toLowerCase()}`);
  if (method === "Décision") set("methodPhrase", `par ${vars.decisionLabel ?? "décision"}`);
  else if (vars.methodLabel) set("methodPhrase", `par ${vars.methodLabel}`);
  const round = /^r?\s*(\d+)$/i.exec(asText(fields.round) ?? "");
  if (round) {
    set("roundLabel", `${ordinal(Number(round[1]))} round`);
    if (method !== "Décision") set("roundPhrase", `au ${vars.roundLabel}`);
  }
  const submission = asText(fields.submissionType);
  if (submission && submission !== "Autre")
    set("submissionLabel", submission.charAt(0).toLowerCase() + submission.slice(1));
  const defenses = Number(asText(fields.defenseCount));
  if (Number.isInteger(defenses) && defenses > 0)
    set("defenseLabel", `${ordinal(defenses, true)} défense`);

  // DAILY.
  if (asText(fields.airDate)) set("airDateLabel", formatDayLabel(asText(fields.airDate)!));
  const days = Number(asText(fields.daysLeft));
  if (Number.isInteger(days) && days > 0) {
    set("daysLeftLabel", `J-${days}`);
    set("daysLeftPhrase", days === 1 ? "1 jour" : `${days} jours`);
  }
  const position = asText(fields.cardPosition);
  if (position === "Main event" || position === "Co-main event") {
    set("cardPositionPhrase", `en ${position.toLowerCase()}`);
  }
  if (fields.title === true) {
    set(
      "titlePhrase",
      vars.weightClass
        ? `la ceinture d'HEXAGONE MMA des ${vars.weightClass.toLowerCase()} sera en jeu`
        : "la ceinture d'HEXAGONE MMA sera en jeu",
    );
  }
  if (
    !vars.fightsList &&
    event &&
    event.fightCard.length > 0 &&
    category.id === "daily_fight_card"
  ) {
    const order = { main: 0, "co-main": 1, card: 2, prelim: 3 } as const;
    const lines = [...event.fightCard]
      .sort((a, b) => order[a.position] - order[b.position])
      .map((fight) => {
        const a = sources.fighters.find((f) => f.id === fight.fighterAId);
        const b = sources.fighters.find((f) => f.id === fight.fighterBId);
        if (a && !linkedFighters.includes(a)) linkedFighters.push(a);
        if (b && !linkedFighters.includes(b)) linkedFighters.push(b);
        return a && b ? `${fullName(a)} vs ${fullName(b)}` : undefined;
      })
      .filter((line): line is string => Boolean(line));
    if (lines.length > 0) set("fightsList", lines.join("\n"));
  }

  set("hashtags", sources.hashtags.join(" "));
  set("cta", sources.cta);
  set("signature", sources.signatureText);

  // Faits autorisés.
  facts.push(...Object.values(vars));
  if (session) {
    facts.push(
      session.eventName,
      String(session.eventNumber ?? ""),
      session.venue ?? "",
      session.city ?? "",
    );
    facts.push(session.broadcast ?? "", session.date ?? "");
  }
  if (event) {
    facts.push(
      event.name,
      String(event.number ?? ""),
      event.city ?? "",
      event.venue ?? "",
      event.address ?? "",
    );
    for (const b of event.broadcasters) {
      facts.push(b.name, b.channel ?? "");
      if (event.confirmedSchedule) facts.push(b.startTime ?? "");
    }
  }
  for (const f of linkedFighters) {
    facts.push(
      fullName(f),
      f.nickname ?? "",
      f.weightClass ?? "",
      f.club ?? "",
      f.nationality ?? "",
    );
  }

  return { vars, facts: facts.filter(Boolean), linkedFighters };
}
