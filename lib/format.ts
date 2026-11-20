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
