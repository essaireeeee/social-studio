/** Catalogue unique des champs de brief. Les catégories y font référence par clé. */
import type { FieldDef } from "./types";

const field = (key: string, def: Omit<FieldDef, "key">): FieldDef => ({ key, ...def });

const FIELD_LIST: FieldDef[] = [
  // --- Combattants ---------------------------------------------------------
  field("fighter1", { label: "Combattant 1", type: "fighter" }),
  field("fighter2", { label: "Combattant 2", type: "fighter" }),
  field("winner", { label: "Vainqueur", type: "fighter", pickFrom: ["fighter1", "fighter2"] }),
  field("loser", { label: "Perdant", type: "fighter" }),
  field("fighter", { label: "Combattant", type: "fighter" }),
  field("opponent", { label: "Adversaire", type: "fighter" }),
  field("fighters", { label: "Combattants", type: "fighter", multiple: true }),
  field("champion", { label: "Champion", type: "fighter" }),
  field("challenger", { label: "Challenger", type: "fighter" }),
  field("fighterA", { label: "Combattant A", type: "fighter" }),
  field("fighterB", { label: "Combattant B", type: "fighter" }),
  field("person", {
    label: "Personne",
    type: "fighter",
    placeholder: "Combattant de la base ou nom libre",
  }),

  // --- Résultat ------------------------------------------------------------
  field("method", { label: "Méthode", type: "chips", options: "settings.methods", promote: true }),
  field("round", { label: "Round", type: "chips", options: "settings.rounds", promote: true }),
  field("time", { label: "Temps", type: "time", timeFormat: "fight", placeholder: "m:ss" }),
  field("decisionType", {
    label: "Type de décision",
    type: "chips",
    options: ["Unanime", "Partagée", "Majoritaire"],
    showIf: { field: "method", equals: "Décision" },
    promote: true,
  }),
  field("submissionType", {
    label: "Soumission",
    type: "chips",
    options: ["Étranglement arrière", "Guillotine", "Clé de bras", "Triangle", "Kimura", "Autre"],
    allowCustom: true,
    promote: true,
  }),
  field("scores", {
    label: "Scores des juges",
    type: "text",
    placeholder: "29-28, 29-28, 30-27",
    helpText: "Uniquement les scores officiels.",
  }),
  field("weightClass", { label: "Catégorie de poids", type: "text", placeholder: "Poids légers" }),
  field("defenseCount", {
    label: "Nombre de défenses",
    type: "text",
    inputMode: "numeric",
    helpText: "Uniquement si le chiffre est confirmé.",
  }),
  field("highlight", {
    label: "Fait marquant",
    type: "textarea",
    placeholder: "Ce qui s'est passé, en quelques mots",
    maxLength: 280,
  }),
  field("quote", {
    label: "Citation",
    type: "textarea",
    helpText: "Reprise mot pour mot, entre guillemets.",
  }),
  field("context", { label: "Contexte", type: "text" }),

  // --- Événement -----------------------------------------------------------
  field("event", { label: "Événement", type: "event" }),
  field("cardPosition", {
    label: "Position sur la carte",
    type: "select",
    options: ["Main event", "Co-main event", "Combat classique"],
    promote: true,
  }),
  field("date", { label: "Date", type: "date", fromSession: "date", fromEvent: "date" }),
  field("city", { label: "Ville", type: "text", fromSession: "city", fromEvent: "city" }),
  field("venue", { label: "Salle", type: "text", fromSession: "venue", fromEvent: "venue" }),
  field("fights", {
    label: "Combats",
    type: "chips",
    options: "event.fightCard",
    multiple: true,
  }),
  field("title", { label: "Combat pour le titre", type: "toggle" }),
  field("stakes", { label: "Enjeu", type: "textarea" }),
  field("priceInfo", {
    label: "Tarifs",
    type: "text",
    helpText: "Uniquement les prix officiels.",
  }),
  field("ticketLink", {
    label: "Lien billetterie",
    type: "url",
    fromSession: "ticketing",
    fromEvent: "ticketingUrl",
  }),
  field("promoAngle", { label: "Angle promotionnel", type: "text" }),
  field("daysLeft", { label: "Jours restants", type: "text", inputMode: "numeric" }),
  field("highlightFight", { label: "Combat phare", type: "text" }),
  field("dayProgram", { label: "Programme du jour", type: "textarea" }),
  field("schedule", {
    label: "Horaires",
    type: "textarea",
    helpText: "Repris exactement tels que saisis.",
  }),
  field("urgencyNote", { label: "Précision sur l'urgence", type: "text" }),

  // --- Contenu libre -------------------------------------------------------
  field("extra", { label: "Informations complémentaires", type: "textarea" }),
  field("angle", { label: "Angle", type: "text" }),
  field("subject", { label: "Sujet", type: "text" }),
  field("details", { label: "Détails", type: "textarea" }),
  field("link", { label: "Lien", type: "url" }),
  field("period", { label: "Période", type: "text" }),

  // --- Médias --------------------------------------------------------------
  field("mediaType", {
    label: "Type de média",
    type: "select",
    options: ["Presse", "Interview", "TV", "Radio", "Podcast", "YouTube", "Portrait", "Combattant"],
  }),
  field("media", { label: "Média", type: "text", placeholder: "Nom du média" }),
  field("articleTitle", { label: "Titre de l'article", type: "text" }),
  field("journalist", { label: "Journaliste", type: "text" }),
  field("topic", { label: "Sujet abordé", type: "text" }),
  field("showName", { label: "Émission ou podcast", type: "text" }),
  field("airDate", { label: "Date de diffusion", type: "date" }),
  field("airTime", {
    label: "Heure de diffusion",
    type: "time",
    timeFormat: "clock",
    placeholder: "20h30",
  }),
  field("presenter", { label: "Présentateur", type: "text" }),
  field("host", { label: "Animateur", type: "text" }),
  field("channel", { label: "Chaîne", type: "text" }),
  field("videoTitle", { label: "Titre de la vidéo", type: "text" }),

  // --- Communication -------------------------------------------------------
  field("partnerName", { label: "Partenaire", type: "text" }),
  field("partnershipType", { label: "Type de partenariat", type: "text" }),
  field("target", { label: "Destinataires", type: "text" }),
  field("body", { label: "Texte du communiqué", type: "textarea" }),
];

export const FIELDS: Readonly<Record<string, FieldDef>> = Object.freeze(
  Object.fromEntries(FIELD_LIST.map((def) => [def.key, def])),
);

export const FIELD_KEYS: readonly string[] = FIELD_LIST.map((def) => def.key);
