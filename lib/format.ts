/** Formats d'affichage français partagés par l'interface. Logique pure. */

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** « 20/11/2026 14:33 », dans le fuseau du navigateur sauf fuseau explicite. */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("fr-FR", { ...DATE_TIME_OPTIONS, timeZone })
    .format(new Date(iso))
    .replace(",", "");
}

/** « 1 wording », « 6 wordings ». */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** « 20/11/2026 ». Une date seule (« 2026-03-14 ») est lue sans décalage de fuseau. */
export function formatDate(iso: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : undefined,
  }).format(new Date(iso));
}

const SCORE_FORMAT = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** « 0,82 » */
export function formatScore(value: number): string {
  return SCORE_FORMAT.format(value);
}

/** « samedi 14 mars » (date d'un événement ou d'une diffusion, sans l'année). */
export function formatDayLabel(iso: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: dateOnly ? "UTC" : undefined,
  }).format(new Date(iso));
}
