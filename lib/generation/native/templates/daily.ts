/**
 * Formulations DAILY & MEDIA : sport et événement. Mêmes règles que LIVE, plus :
 * - question finale autorisée seulement sur les catégories qui en déclarent une
 *   (le moteur la limite à une génération sur trois, variante Storytelling) ;
 * - aucune promesse non fournie (prix, rareté, horaires).
 */
import type { CategoryCopy } from "./factory";

export const DAILY_INFO = [
  "🗓️ {dateLabel} · {venue}, {city}",
  "🗓️ {dateLabel} · {city}",
  "🗓️ {dateLabel}",
  "📍 {venue}, {city}",
];
export const DAILY_CLOSING = ["Plus d'informations très vite.", "On vous en dit plus très vite."];

const daily = (
  copy: Omit<CategoryCopy, "info" | "closing"> & Partial<Pick<CategoryCopy, "info" | "closing">>,
): CategoryCopy => ({
  info: DAILY_INFO,
  closing: DAILY_CLOSING,
  ...copy,
});

export const DAILY_SPORT_COPY: CategoryCopy[] = [
  daily({
    categoryId: "daily_fight_announce",
    mustMention: ["fighterA", "fighterB"],
    hooks: {
      punchy: [
        ["{E} COMBAT OFFICIEL", "{E} C'EST OFFICIEL !"],
        ["{E} {fighterA} vs {fighterB}.", "{E} {fighterA} contre {fighterB}."],
        ["{E} Nouveau combat annoncé !", "{E} Un combat de plus à l'affiche."],
      ],
      signature: [
        [
          "{E} {fighterA} affrontera {fighterB} lors de {eventLabel}.",
          "{E} {fighterA} face à {fighterB}, c'est officiel.",
        ],
        [
          "{E} {eventLabel} : {fighterA} face à {fighterB}.",
          "{E} Combat officiel pour {eventLabel}.",
        ],
        ["{E} {fighterA} et {fighterB} se retrouveront dans la cage."],
      ],
      storytelling: [
        ["{E} Un choc se prépare.", "{E} Deux styles, une cage."],
        ["{E} Mettez ce combat dans vos agendas."],
        ["{E} L'affiche est posée."],
      ],
    },
    core: [
      "{fighterA} affrontera {fighterB} {cardPositionPhrase} de {eventLabel}.",
      "{fighterA} affrontera {fighterB} lors de {eventLabel}.",
      "{fighterA} et {fighterB} s'affronteront lors de {eventLabel}.",
    ],
    detail: ["Combat chez les {weightClass|lower}.", "{extra}"],
    context: [
      "{fighterA} d'un côté, {fighterB} de l'autre : rendez-vous dans la cage de {eventLabel}.",
    ],
    story: [
      "{extra}",
      "Combat chez les {weightClass|lower}.",
      "Le rendez-vous est pris pour {eventLabel}.",
    ],
    question: ["Qui l'emportera ?", "Votre pronostic ?"],
  }),
  daily({
    categoryId: "daily_fighter_intro",
    mustMention: ["fighter"],
    hooks: {
      punchy: [
        ["{E} {FIGHTER_UPPER}", "{E} Faites connaissance avec {fighter}."],
        ["{E} Qui est {fighter} ?"],
        ["{E} Portrait : {fighter}."],
      ],
      signature: [
        ["{E} {fighter} sera à l'affiche de {eventLabel}.", "{E} Présentation : {fighter}."],
        ["{E} À suivre : {fighter}."],
        ["{E} Gros plan sur {fighter}."],
      ],
      storytelling: [
        ["{E} Avant la cage, il y a un parcours."],
        ["{E} Un nom à retenir."],
        ["{E} Gros plan sur un combattant de la ligue."],
      ],
    },
    core: [
      "{fighter} : {angle}.",
      "{fighter} sera de la soirée {eventLabel}.",
      "Focus sur {fighter}.",
    ],
    detail: [
      "Palmarès : {fighterRecord}.",
      "Catégorie : {fighterWeightClass|lower}.",
      "Club : {fighterClub}.",
      "{extra}",
    ],
    context: [
      "{fighterBio}",
      "{fighter} combat chez les {fighterWeightClass|lower}.",
      "{angle|cap}.",
    ],
    story: ["{extra}", "Palmarès : {fighterRecord}.", "Club : {fighterClub}."],
    question: ["Vous connaissiez ce nom ?"],
  }),
  daily({
    categoryId: "daily_fight_card",
    mustMention: ["fightsList"],
    hooks: {
      punchy: [
        ["{E} LA CARTE DE {EVENT_LABEL_UPPER}", "{E} La carte de {eventLabel}."],
        ["{E} Voici la carte."],
        ["{E} La fight card est là."],
      ],
      signature: [
        ["{E} La carte de {eventLabel}."],
        ["{E} Au programme de {eventLabel}."],
        ["{E} Les combats de {eventLabel}."],
      ],
      storytelling: [
        ["{E} Une soirée se construit combat après combat."],
        ["{E} Place aux affiches."],
        ["{E} Ce qui vous attend dans la cage."],
      ],
    },
    core: ["{fightsList}"],
    detail: ["{extra}"],
    context: ["Voici les combats annoncés pour {eventLabel}.", "Les combats annoncés à ce jour."],
    story: ["{extra}", "Rendez-vous lors de {eventLabel}."],
  }),
  daily({
    categoryId: "daily_main_event",
    mustMention: ["fighterA", "fighterB"],
    hooks: {
      punchy: [
        ["{E} {CARD_POSITION_UPPER} : {FIGHTER_A_UPPER} VS {FIGHTER_B_UPPER}"],
        ["{E} {cardPosition} : {fighterA} vs {fighterB}."],
        ["{E} L'affiche est posée.", "{E} Une affiche se dessine."],
      ],
      signature: [
        ["{E} {fighterA} vs {fighterB} {cardPositionPhrase} de {eventLabel}."],
        ["{E} {cardPosition} de {eventLabel} : {fighterA} face à {fighterB}."],
        ["{E} {fighterA} et {fighterB} en haut de l'affiche de {eventLabel}."],
      ],
      storytelling: [
        ["{E} Une affiche se dessine."],
        ["{E} Deux noms en haut de l'affiche."],
        ["{E} Le décor est planté."],
      ],
    },
    core: ["{fighterA} et {fighterB} s'affronteront {cardPositionPhrase} de {eventLabel}."],
    detail: ["{titlePhrase|cap}.", "Combat chez les {weightClass|lower}.", "{stakes}"],
    context: ["{stakes}", "Un combat chez les {weightClass|lower}, {cardPositionPhrase}."],
    story: ["{titlePhrase|cap}.", "Rendez-vous lors de {eventLabel}."],
    question: ["Qui l'emportera ?", "Votre pronostic ?"],
  }),
  daily({
    categoryId: "daily_faceoff",
    mustMention: ["fighterA", "fighterB"],
    hooks: {
      punchy: [
        ["{E} FACE À FACE", "{E} {fighterA} / {fighterB}."],
        ["{E} Les regards en disent long."],
        ["{E} Ça chauffe déjà."],
      ],
      signature: [
        ["{E} Face-à-face entre {fighterA} et {fighterB}."],
        ["{E} {fighterA} et {fighterB} se sont fait face avant {eventLabel}."],
        ["{E} {fighterA} et {fighterB}, yeux dans les yeux."],
      ],
      storytelling: [
        ["{E} Les mots, puis les regards."],
        ["{E} Le combat a déjà commencé dans les têtes."],
        ["{E} La tension monte."],
      ],
    },
    core: ["{fighterA} et {fighterB} se sont fait face.", "{fighterA} et {fighterB} face à face."],
    detail: ["{context}"],
    context: ["{context}"],
    story: ["Rendez-vous dans la cage de {eventLabel}.", "Rendez-vous dans la cage."],
    question: ["Qui l'emportera ?"],
  }),
  daily({
    categoryId: "daily_sport_news",
    mustMention: ["subject"],
    hooks: {
      punchy: [["{E} À la une."], ["{E} Actualité sportive."], ["{E} L'info sportive."]],
      signature: [
        ["{E} {subject|cap}."],
        ["{E} Actualité : {subject}."],
        ["{E} Sur le devant de la scène : {subject}."],
      ],
      storytelling: [
        ["{E} Ce qu'il faut savoir."],
        ["{E} Point sur l'actualité."],
        ["{E} Les nouvelles de la ligue."],
      ],
    },
    core: ["{details}", "{subject|cap}."],
    detail: ["Avec {fightersList}.", "Les détails via le lien en bio.{?link}"],
    context: ["{details}", "{subject|cap}."],
    story: ["Avec {fightersList}.", "Les détails via le lien en bio.{?link}"],
  }),
  daily({
    categoryId: "daily_retro",
    mustMention: ["subject"],
    hooks: {
      punchy: [
        ["{E} Souvenir.", "{E} Retour en arrière."],
        ["{E} Flashback."],
        ["{E} On s'en souvient ?"],
      ],
      signature: [
        ["{E} Retour sur {subject}.", "{E} Souvenir de {eventLabel} : {subject}."],
        ["{E} {period|cap} : {subject}."],
        ["{E} Retour sur un moment de la ligue."],
      ],
      storytelling: [
        ["{E} Certains combats restent."],
        ["{E} La mémoire de la cage."],
        ["{E} Retour vers un moment de la ligue."],
      ],
    },
    core: ["{details}", "Retour sur {subject}."],
    detail: ["Avec {fightersList}.", "C'était lors de {eventLabel}.", "{period|cap}."],
    context: ["{details}", "Retour sur {subject}."],
    story: ["C'était lors de {eventLabel}.", "Avec {fightersList}.", "{period|cap}."],
  }),
];

export const DAILY_EVENT_COPY: CategoryCopy[] = [
  daily({
    categoryId: "daily_ticketing",
    mustMention: ["eventLabel"],
    hooks: {
      punchy: [
        ["{E} BILLETTERIE {EVENT_LABEL_UPPER}", "{E} Billetterie : {eventLabel}."],
        ["{E} Vos places pour {eventLabel}."],
        ["{E} Prenez vos places.", "{E} Réservez vos places."],
      ],
      signature: [
        ["{E} Les places pour {eventLabel} sont disponibles."],
        ["{E} Billetterie : {eventLabel}."],
        ["{E} {eventLabel} : réservez vos places."],
      ],
      storytelling: [
        ["{E} Une soirée de combats se vit en salle."],
        ["{E} Rien ne remplace la cage en vrai."],
        ["{E} Le bruit, la tension, les combats au plus près."],
      ],
    },
    core: [
      "Les places pour {eventLabel} sont disponibles.",
      "La billetterie de {eventLabel} vous attend.",
    ],
    detail: [
      "Tarifs : {priceInfo}.",
      "{promoAngle|cap}.",
      "Billetterie via le lien en bio.{?ticketLink}",
    ],
    context: ["{promoAngle|cap}.", "Venez vivre {eventLabel} au plus près de la cage."],
    story: [
      "Tarifs : {priceInfo}.",
      "Billetterie via le lien en bio.{?ticketLink}",
      "Les places se réservent dès maintenant.",
    ],
  }),
  daily({
    categoryId: "daily_countdown",
    mustMention: ["eventLabel"],
    hooks: {
      punchy: [
        ["{E} {daysLeftLabel} !", "{E} {daysLeftLabel} avant {eventLabel}."],
        ["{E} Plus que {daysLeftPhrase}."],
        ["{E} Le compte à rebours est lancé."],
      ],
      signature: [
        ["{E} {eventLabel}, c'est dans {daysLeftPhrase}."],
        ["{E} {daysLeftLabel} : {eventLabel} approche."],
        ["{E} Dans {daysLeftPhrase}, {eventLabel}."],
      ],
      storytelling: [
        ["{E} Les jours passent, la cage se rapproche."],
        ["{E} Bientôt l'heure."],
        ["{E} Le décompte continue."],
      ],
    },
    core: [
      "{eventLabel} arrive dans {daysLeftPhrase}.",
      "Plus que {daysLeftPhrase} avant {eventLabel}.",
    ],
    detail: ["À l'affiche : {highlightFight}.", "Combat phare : {highlightFight}."],
    context: ["Dans {daysLeftPhrase}, la cage de {eventLabel} s'ouvre."],
    story: ["À l'affiche : {highlightFight}.", "Le compte à rebours continue."],
    question: ["Vous serez là ?"],
  }),
  daily({
    categoryId: "daily_event_announce",
    mustMention: ["eventLabel"],
    hooks: {
      punchy: [
        ["{E} {EVENT_LABEL_UPPER} EST ANNONCÉ", "{E} {eventLabel} arrive."],
        ["{E} Nouvelle soirée annoncée."],
        ["{E} Notez la date.", "{E} C'est officiel."],
      ],
      signature: [
        [
          "{E} {eventLabel} aura lieu le {dateLabel} à {city}.",
          "{E} {eventLabel} aura lieu le {dateLabel}.",
        ],
        ["{E} Rendez-vous pour {eventLabel}."],
        ["{E} {eventLabel} est officiel."],
      ],
      storytelling: [
        ["{E} Une nouvelle date pour la ligue."],
        ["{E} La cage revient."],
        ["{E} Notez bien cette soirée."],
      ],
    },
    core: [
      "{eventLabel} se tiendra à {venue}, {city}.",
      "{eventLabel} se tiendra à {city}.",
      "{eventLabel} est officiellement annoncé.",
    ],
    detail: ["{extra}"],
    context: ["{extra}", "{eventLabel} se prépare."],
    story: ["{eventLabel} se tiendra le {dateLabel}.", "{eventLabel} se tiendra à {city}."],
    question: ["Vous serez de la partie ?"],
  }),
  daily({
    categoryId: "daily_fight_week",
    mustMention: ["eventLabel"],
    hooks: {
      punchy: [
        ["{E} FIGHT WEEK !", "{E} C'est la fight week."],
        ["{E} {eventLabel} : la semaine du combat."],
        ["{E} La semaine commence."],
      ],
      signature: [
        ["{E} Fight week pour {eventLabel}."],
        ["{E} Dernière ligne droite avant {eventLabel}."],
        ["{E} {eventLabel} : place à la fight week."],
      ],
      storytelling: [
        ["{E} Le compte à rebours touche à sa fin."],
        ["{E} Tout s'accélère."],
        ["{E} Une semaine pas comme les autres."],
      ],
    },
    core: ["Au programme du jour : {dayProgram}.", "C'est la semaine de {eventLabel}."],
    detail: ["À l'affiche : {highlightFight}."],
    context: ["{dayProgram}", "La semaine de {eventLabel} commence."],
    story: ["À l'affiche : {highlightFight}.", "Suivez la semaine avec nous."],
  }),
  daily({
    categoryId: "daily_program",
    mustMention: ["schedule"],
    hooks: {
      punchy: [
        ["{E} LE PROGRAMME", "{E} Le programme de {eventLabel}."],
        ["{E} Votre soirée, étape par étape."],
        ["{E} Notez les horaires."],
      ],
      signature: [
        ["{E} Programme de {eventLabel}."],
        ["{E} Les horaires de {eventLabel}."],
        ["{E} Voici le déroulé de {eventLabel}."],
      ],
      storytelling: [
        ["{E} Pour ne rien manquer de la soirée."],
        ["{E} Organisez votre soirée."],
        ["{E} Tout le déroulé."],
      ],
    },
    core: ["{schedule}"],
    detail: ["{extra}"],
    context: ["Voici le programme de {eventLabel}.", "Voici le programme."],
    story: ["{extra}", "Bonne soirée à tous."],
  }),
  daily({
    categoryId: "daily_last_seats",
    mustMention: ["eventLabel"],
    hooks: {
      punchy: [
        ["{E} DERNIÈRES PLACES !", "{E} Dernières places pour {eventLabel}."],
        ["{E} Ne tardez plus."],
        ["{E} Dernier appel."],
      ],
      signature: [
        ["{E} Dernières places pour {eventLabel}."],
        ["{E} {eventLabel} : dernières places disponibles."],
        ["{E} Les dernières places de {eventLabel} sont en vente."],
      ],
      storytelling: [
        ["{E} Le moment de se décider."],
        ["{E} Une place en salle, ça ne se rattrape pas."],
        ["{E} Dernier appel."],
      ],
    },
    core: [
      "Les dernières places pour {eventLabel} sont en vente.",
      "Il reste des places pour {eventLabel}, mais plus pour longtemps.",
    ],
    detail: ["{urgencyNote|cap}.", "Billetterie via le lien en bio.{?ticketLink}"],
    context: ["{urgencyNote|cap}.", "La salle de {eventLabel} se remplit."],
    story: ["Billetterie via le lien en bio.{?ticketLink}", "Les dernières places sont en vente."],
  }),
];
