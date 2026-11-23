/**
 * Formulations MÉDIAS et COMMUNICATION. La personne peut être un combattant ou non :
 * aucune formule ne suppose son métier, son genre ou son parcours.
 */
import { DAILY_CLOSING, DAILY_INFO } from "./daily";
import type { CategoryCopy } from "./factory";

const daily = (
  copy: Omit<CategoryCopy, "info" | "closing"> & Partial<Pick<CategoryCopy, "info" | "closing">>,
): CategoryCopy => ({
  info: DAILY_INFO,
  closing: DAILY_CLOSING,
  ...copy,
});

const LINK_IN_BIO = "À retrouver via le lien en bio.{?link}";

export const MEDIA_COPY: CategoryCopy[] = [
  daily({
    categoryId: "media_press",
    mustMention: ["person", "media"],
    hooks: {
      punchy: [
        ["{E} {person} dans {media}.", "{E} À lire : {person} dans {media}."],
        ["{E} {PERSON_UPPER} DANS LA PRESSE"],
        ["{E} Revue de presse."],
      ],
      signature: [
        ["{E} {media} consacre un article à {person}.", "{E} {person} à l'honneur dans {media}."],
        ["{E} {person} dans les colonnes de {media}."],
        ["{E} À lire dans {media} : {articleTitle}.", "{E} Un article de {media} sur {person}."],
      ],
      storytelling: [
        ["{E} Lecture conseillée."],
        ["{E} Un article signé {journalist}.", "{E} La presse en parle."],
        ["{E} {media} s'intéresse à {person}."],
      ],
    },
    core: ["{media} consacre un article à {person}.", "{person} dans les colonnes de {media}."],
    detail: [
      "Au sommaire : {topic}.",
      "Un article signé {journalist}.",
      "À lire via le lien en bio.{?link}",
    ],
    context: ["Le sujet : {topic}.", "{media} consacre un article à {person}."],
    story: [
      "Bonne lecture.",
      "À lire via le lien en bio.{?link}",
      "Un article signé {journalist}.",
      "Titre : {articleTitle}.",
    ],
  }),
  daily({
    categoryId: "media_interview",
    mustMention: ["person", "media"],
    hooks: {
      punchy: [
        ["{E} {person} en interview.", "{E} Interview : {person}."],
        ["{E} {PERSON_UPPER} AU MICRO"],
        ["{E} Micro tendu à {person}."],
      ],
      signature: [
        ["{E} {person} répond aux questions de {media}."],
        ["{E} {person} est à retrouver dans {showName}."],
        ["{E} Interview de {person} pour {media}."],
      ],
      storytelling: [
        ["{E} Prendre le temps de parler."],
        ["{E} Une interview à écouter."],
        ["{E} Au micro de {media}."],
      ],
    },
    core: [
      "{person} répond aux questions de {media}.",
      "{person} est à retrouver dans {showName} sur {media}.",
    ],
    detail: [
      "Rendez-vous le {airDateLabel} à {airTime}.",
      "Rendez-vous le {airDateLabel}.",
      "Au programme : {topic}.",
      "Interview menée par {journalist}.",
      LINK_IN_BIO,
    ],
    context: ["Au programme : {topic}.", "{person} répond aux questions de {media}."],
    story: [
      "Bonne écoute.",
      "Rendez-vous le {airDateLabel} à {airTime}.",
      "Rendez-vous le {airDateLabel}.",
      LINK_IN_BIO,
    ],
  }),
  daily({
    categoryId: "media_tv",
    mustMention: ["person", "media"],
    hooks: {
      punchy: [
        ["{E} {person} à la télé !", "{E} {person} sur {media}."],
        ["{E} {PERSON_UPPER} SUR {MEDIA_UPPER}"],
        ["{E} Rendez-vous devant la télé."],
      ],
      signature: [
        ["{E} {person} sera sur {media} le {airDateLabel}."],
        ["{E} {person} dans {showName} sur {media}."],
        ["{E} Passage télé pour {person}."],
      ],
      storytelling: [
        ["{E} La ligue s'invite à la télévision."],
        ["{E} Allumez la télé."],
        ["{E} Rendez-vous devant l'écran."],
      ],
    },
    core: [
      "{person} sera sur {media} le {airDateLabel} à {airTime}.",
      "{person} sera sur {media} le {airDateLabel}.",
    ],
    detail: [
      "Dans l'émission {showName}, présentée par {presenter}.",
      "Dans l'émission {showName}.",
      "Au programme : {topic}.",
    ],
    context: ["{person} sera dans {showName}.", "Au programme : {topic}."],
    story: [
      "À vos écrans.",
      "Au programme : {topic}.",
      "Rendez-vous le {airDateLabel} sur {media}.",
    ],
  }),
  daily({
    categoryId: "media_radio",
    mustMention: ["person", "media"],
    hooks: {
      punchy: [
        ["{E} {person} à la radio !", "{E} {person} sur {media}."],
        ["{E} {PERSON_UPPER} SUR {MEDIA_UPPER}"],
        ["{E} Montez le son."],
      ],
      signature: [
        [
          "{E} {person} sera sur {media} le {airDateLabel}.",
          "{E} {person} sur l'antenne de {media}.",
        ],
        ["{E} {person} dans {showName} sur {media}."],
        ["{E} Passage radio pour {person}."],
      ],
      storytelling: [
        ["{E} À écouter."],
        ["{E} Une voix sur les ondes."],
        ["{E} Rendez-vous à l'antenne."],
      ],
    },
    core: [
      "{person} sera sur {media} le {airDateLabel} à {airTime}.",
      "{person} sera sur {media} le {airDateLabel}.",
      "{person} sur l'antenne de {media}.",
    ],
    detail: ["Dans l'émission {showName}.", "Au programme : {topic}.", LINK_IN_BIO],
    context: ["Au programme : {topic}.", "{person} sera dans {showName}."],
    story: [
      "Bonne écoute.",
      "Rendez-vous le {airDateLabel} à {airTime}.",
      "Rendez-vous le {airDateLabel}.",
      LINK_IN_BIO,
    ],
  }),
  daily({
    categoryId: "media_podcast",
    mustMention: ["person", "showName"],
    hooks: {
      punchy: [
        ["{E} {person} dans {showName}.", "{E} Nouvel épisode avec {person}."],
        ["{E} {PERSON_UPPER} EN PODCAST"],
        ["{E} Casque sur les oreilles."],
      ],
      signature: [
        ["{E} {person} au micro du podcast {showName}.", "{E} {person} au micro de {showName}."],
        ["{E} {showName} reçoit {person}."],
        ["{E} Un épisode de {showName} avec {person}."],
      ],
      storytelling: [
        ["{E} Un format long pour prendre le temps."],
        ["{E} Le temps d'aller au fond des choses."],
        ["{E} À écouter au calme."],
      ],
    },
    core: ["{person} au micro de {showName}.", "{showName} reçoit {person}."],
    detail: ["Avec {host} à l'animation.", "Au programme : {topic}.", LINK_IN_BIO],
    context: ["Au programme : {topic}.", "{showName} reçoit {person}."],
    story: ["Bonne écoute.", LINK_IN_BIO, "Avec {host} à l'animation."],
  }),
  daily({
    categoryId: "media_youtube",
    mustMention: ["person", "channel"],
    hooks: {
      punchy: [
        ["{E} {person} sur {channel}.", "{E} Nouvelle vidéo avec {person}."],
        ["{E} {PERSON_UPPER} SUR YOUTUBE"],
        ["{E} À regarder."],
      ],
      signature: [
        ["{E} {person} dans la nouvelle vidéo de {channel}."],
        ["{E} {channel} reçoit {person}."],
        ["{E} {videoTitle} : la vidéo avec {person}."],
      ],
      storytelling: [
        ["{E} Une vidéo à ne pas rater."],
        ["{E} Place à l'image."],
        ["{E} À voir sur YouTube."],
      ],
    },
    core: ["{person} dans une vidéo de {channel}.", "{channel} reçoit {person}."],
    detail: ["Titre : {videoTitle}.", "Au programme : {topic}.", LINK_IN_BIO],
    context: ["Au programme : {topic}.", "{channel} reçoit {person}."],
    story: ["Bon visionnage.", LINK_IN_BIO, "Titre : {videoTitle}."],
  }),
  daily({
    categoryId: "media_portrait",
    mustMention: ["person", "media"],
    hooks: {
      punchy: [
        ["{E} {person} en portrait.", "{E} Portrait : {person}."],
        ["{E} {PERSON_UPPER} EN PORTRAIT"],
        ["{E} Un portrait à découvrir."],
      ],
      signature: [
        ["{E} {media} dresse le portrait de {person}."],
        ["{E} Le portrait de {person} par {media}."],
        ["{E} {person} vu par {media}."],
      ],
      storytelling: [
        ["{E} Derrière le nom, une histoire."],
        ["{E} Un portrait qui prend le temps."],
        ["{E} Lecture conseillée."],
      ],
    },
    core: ["{media} dresse le portrait de {person}.", "{person} vu par {media}."],
    detail: ["L'angle : {angle}.", LINK_IN_BIO],
    context: ["L'angle : {angle}.", "{media} dresse le portrait de {person}."],
    story: ["Bonne lecture.", LINK_IN_BIO, "Un portrait signé {media}."],
  }),
  daily({
    categoryId: "media_fighter_news",
    mustMention: ["fighter", "media"],
    hooks: {
      punchy: [
        ["{E} {fighter} dans {media}.", "{E} On parle de {fighter}."],
        ["{E} {FIGHTER_UPPER} DANS LES MÉDIAS"],
        ["{E} Revue de presse."],
      ],
      signature: [
        ["{E} {fighter} dans {media}.", "{E} {media} parle de {fighter}."],
        ["{E} {fighter} à l'honneur dans {media}."],
        ["{E} {media} s'intéresse à {fighter}."],
      ],
      storytelling: [
        ["{E} Nos combattants font parler d'eux."],
        ["{E} La ligue dans les médias."],
        ["{E} À lire, à voir, à écouter."],
      ],
    },
    core: ["{media} parle de {fighter}.", "{fighter} à l'honneur dans {media}."],
    detail: ["Le sujet : {topic}.", LINK_IN_BIO],
    context: ["Le sujet : {topic}.", "{media} parle de {fighter}."],
    story: ["À découvrir.", LINK_IN_BIO, "Le sujet : {topic}."],
  }),
];

export const COMMUNICATION_COPY: CategoryCopy[] = [
  daily({
    categoryId: "comm_partner",
    mustMention: ["partnerName"],
    hooks: {
      punchy: [
        ["{E} Merci à {partnerName}.", "{E} Partenaire : {partnerName}."],
        ["{E} {PARTNER_NAME_UPPER} AVEC NOUS"],
        ["{E} Nos partenaires."],
      ],
      signature: [
        ["{E} {partnerName} aux côtés de HEXAGONE MMA."],
        ["{E} {partnerName}, partenaire de HEXAGONE MMA."],
        ["{E} {partnershipType|cap} : {partnerName}."],
      ],
      storytelling: [
        ["{E} Derrière chaque soirée, des partenaires."],
        ["{E} Merci à ceux qui nous accompagnent."],
        ["{E} Une ligue se construit à plusieurs."],
      ],
    },
    core: [
      "{partnerName} accompagne HEXAGONE MMA.",
      "{partnerName} est partenaire de HEXAGONE MMA.",
    ],
    detail: [
      "{partnershipType|cap}.",
      "{details}",
      "Plus d'informations via le lien en bio.{?link}",
    ],
    context: ["{details}"],
    story: ["{partnershipType|cap}.", "Merci à {partnerName}."],
  }),
  daily({
    categoryId: "comm_news",
    mustMention: ["subject"],
    hooks: {
      punchy: [
        ["{E} Du nouveau chez HEXAGONE MMA."],
        ["{E} Actu de la ligue."],
        ["{E} L'actualité de HEXAGONE MMA."],
      ],
      signature: [
        ["{E} {subject|cap}."],
        ["{E} HEXAGONE MMA : {subject}."],
        ["{E} L'actualité de la ligue : {subject}."],
      ],
      storytelling: [
        ["{E} La ligue avance."],
        ["{E} Un point d'étape."],
        ["{E} Ce qui bouge chez nous."],
      ],
    },
    core: ["{details}", "{subject|cap}."],
    detail: ["Plus d'informations via le lien en bio.{?link}"],
    context: ["{details}", "{subject|cap}."],
    story: ["{subject|cap}.", "Plus d'informations via le lien en bio.{?link}"],
  }),
  daily({
    categoryId: "comm_statement",
    mustMention: ["body"],
    closing: ["HEXAGONE MMA"],
    hooks: {
      punchy: [["Communiqué."], ["COMMUNIQUÉ"], ["Communiqué de HEXAGONE MMA."]],
      signature: [["Communiqué : {subject}."], ["{subject|cap}."], ["Communiqué de HEXAGONE MMA."]],
      storytelling: [
        ["Information officielle."],
        ["Communiqué officiel."],
        ["À l'attention de tous."],
      ],
    },
    core: ["{body}"],
    context: ["{body}"],
    story: ["Toute nouvelle information sera communiquée sur nos réseaux."],
  }),
  daily({
    categoryId: "comm_thanks",
    mustMention: ["target"],
    hooks: {
      punchy: [["{E} Merci à {target} !"], ["{E} MERCI !"], ["{E} Un grand merci."]],
      signature: [
        ["{E} Merci à {target} pour {eventLabel}.", "{E} Merci à {target}."],
        ["{E} {target|cap} : merci."],
        ["{E} HEXAGONE MMA remercie {target}."],
      ],
      storytelling: [
        ["{E} Une soirée, c'est beaucoup de monde."],
        ["{E} Rien ne se fait seul."],
        ["{E} Place aux remerciements."],
      ],
    },
    core: ["Merci à {target} pour {eventLabel}.", "Merci à {target}."],
    detail: ["{details}"],
    context: ["{details}", "Merci à {target}."],
    story: ["À très vite.", "Merci encore à {target}."],
  }),
  daily({
    categoryId: "comm_institutional",
    mustMention: ["subject"],
    hooks: {
      punchy: [["{E} À noter."], ["{E} ANNONCE"], ["{E} Annonce officielle."]],
      signature: [
        ["{E} {subject|cap}.", "{E} HEXAGONE MMA annonce : {subject}."],
        ["{E} Annonce officielle : {subject}."],
        ["{E} {subject|cap}, à compter du {dateLabel}."],
      ],
      storytelling: [
        ["{E} Une étape pour la ligue."],
        ["{E} Ce qui change."],
        ["{E} Une annonce officielle."],
      ],
    },
    core: ["{details}", "{subject|cap}."],
    detail: ["À compter du {dateLabel}.", "Date : {dateLabel}."],
    context: ["{details}", "{subject|cap}."],
    story: ["{subject|cap}.", "À compter du {dateLabel}."],
  }),
];
