/**
 * Formulations LIVE SHOW. Règles d'écriture :
 * - aucun nombre, nom, date ou diffuseur en dur : uniquement des variables ;
 * - pas d'accord de genre sur un combattant (« s'impose », pas « est champion ») ;
 * - pas de question finale (catégories factuelles) ;
 * - phrases courtes, ton de bord de cage, sans formule creuse.
 */
import type { CategoryCopy } from "./factory";

export const LIVE_INFO = [
  "📍 {eventLabel} · {city}",
  "📍 {eventLabel} · {venue}",
  "📍 {eventLabel}",
  "📺 En direct sur {broadcast}",
];
export const LIVE_CLOSING = ["La soirée continue.", "La suite arrive dans la cage."];

const live = (
  copy: Omit<CategoryCopy, "info" | "closing"> & Partial<Pick<CategoryCopy, "info" | "closing">>,
): CategoryCopy => ({
  info: LIVE_INFO,
  closing: LIVE_CLOSING,
  ...copy,
});

export const LIVE_COPY: CategoryCopy[] = [
  live({
    categoryId: "live_ko",
    mustMention: ["winner"],
    hooks: {
      punchy: [
        ["{E} {WINNER_UPPER} !", "{E} {methodLabel} de {winner} !"],
        ["{winner} éteint la lumière {E}", "{E} Lumière éteinte par {winner}."],
        ["{E} {methodLabel} !", "{E} Terminé par {methodLabel}."],
      ],
      signature: [
        [
          "{E} {winner} s'impose par {methodLabel} {roundPhrase}.",
          "{E} {winner} s'impose par {methodLabel}.",
        ],
        [
          "{E} {methodLabel} {roundPhrase} pour {winner}.",
          "{E} Victoire par {methodLabel} pour {winner}.",
        ],
        ["{E} {winner} fait tomber {loser}.", "{E} {winner} met fin au combat face à {loser}."],
      ],
      storytelling: [
        ["{E} Le combat n'est pas allé au bout.", "{E} Il n'a pas fallu attendre la cloche."],
        ["{E} La puissance a parlé.", "{E} Fin de combat nette."],
        ["{E} Ce que la cage retiendra de ce combat.", "{E} Un finish qui compte."],
      ],
    },
    core: [
      "{methodLabel} {roundPhrase} face à {loser}.",
      "{winner} termine {loser} par {methodLabel}.",
      "{loser} ne termine pas le combat face à {winner}.",
    ],
    detail: ["Arrêt à {time} {roundPhrase}.", "Arrêt à {time}.", "{highlight}"],
    context: [
      "Face à {loser}, {winner} a trouvé l'ouverture et ne l'a pas laissée passer.",
      "{winner} a imposé son rythme face à {loser} jusqu'à l'arrêt.",
    ],
    story: [
      "{highlight}",
      "{methodLabel} {roundPhrase} : le combat s'arrête là.",
      "Le combat s'arrête par {methodLabel}.",
    ],
  }),
  live({
    categoryId: "live_sub",
    mustMention: ["winner"],
    hooks: {
      punchy: [
        ["{E} SOUMISSION DE {WINNER_UPPER} !", "{E} {winner} fait taper {loser} !"],
        ["{E} {winner} fait taper son adversaire.", "{E} Soumission signée {winner}."],
        ["{E} Ça tape !", "{E} Tap out."],
      ],
      signature: [
        [
          "{E} {winner} s'impose par {submissionLabel} {roundPhrase}.",
          "{E} {winner} s'impose par soumission {roundPhrase}.",
          "{E} {winner} s'impose par soumission.",
        ],
        [
          "{E} {submissionLabel|cap} pour {winner} face à {loser}.",
          "{E} Victoire par soumission pour {winner}.",
        ],
        [
          "{E} {winner} trouve la soumission face à {loser}.",
          "{E} {loser} doit abandonner face à {winner}.",
        ],
      ],
      storytelling: [
        ["{E} La technique a fait la différence.", "{E} Une prise, et c'est fini."],
        ["{E} Il suffit d'une ouverture.", "{E} Le grappling a parlé."],
        ["{E} Patience, contrôle, abandon.", "{E} La prise qui fait taper."],
      ],
    },
    core: [
      "{submissionLabel|cap} {roundPhrase} face à {loser}.",
      "{winner} fait abandonner {loser} par {submissionLabel}.",
      "{winner} fait abandonner {loser}.",
    ],
    detail: ["Abandon à {time} {roundPhrase}.", "Abandon à {time}.", "{highlight}"],
    context: [
      "Face à {loser}, {winner} a trouvé la faille.",
      "{winner} a attendu son moment face à {loser}.",
    ],
    story: [
      "{highlight}",
      "{submissionLabel|cap} {roundPhrase} : {loser} doit abandonner.",
      "{loser} doit abandonner : victoire par soumission.",
    ],
  }),
  live({
    categoryId: "live_decision",
    mustMention: ["winner"],
    hooks: {
      punchy: [
        ["{E} {WINNER_UPPER} AUX POINTS !", "{E} {winner} aux points !"],
        ["{E} Les juges ont tranché : {winner}.", "{E} Décision pour {winner}."],
        ["{E} {decisionLabel|cap} !", "{E} Victoire aux points."],
      ],
      signature: [
        [
          "{E} {winner} l'emporte par {decisionLabel}.",
          "{E} Victoire de {winner} par {decisionLabel}.",
        ],
        [
          "{E} {decisionLabel|cap} en faveur de {winner}.",
          "{E} Les juges donnent la victoire à {winner}.",
        ],
        [
          "{E} {winner} prend le dessus sur {loser} aux points.",
          "{E} {winner} bat {loser} aux points.",
        ],
      ],
      storytelling: [
        ["{E} Il a fallu attendre la décision des juges.", "{E} Le combat est allé au bout."],
        ["{E} Jusqu'à la dernière seconde.", "{E} Un combat qui s'est joué sur la durée."],
        ["{E} Verdict des juges.", "{E} Les cartes ont parlé."],
      ],
    },
    core: [
      "{winner} l'emporte face à {loser} par {decisionLabel}.",
      "{decisionLabel|cap} pour {winner} face à {loser}.",
    ],
    detail: ["Les cartes des juges : {scores}.", "{highlight}"],
    context: [
      "{winner} et {loser} sont allés jusqu'au bout.",
      "Aucun des deux n'a lâché avant la cloche finale.",
    ],
    story: [
      "{highlight}",
      "Les juges ont tranché : {decisionLabel} pour {winner}.",
      "Au bout du combat, la décision revient à {winner}.",
    ],
  }),
  live({
    categoryId: "live_result",
    mustMention: ["winner"],
    hooks: {
      punchy: [
        ["{E} VICTOIRE DE {WINNER_UPPER} !", "{E} Victoire de {winner} !"],
        ["{E} {winner} s'impose {methodPhrase}.", "{E} {winner} l'emporte."],
        ["{E} Le résultat est tombé.", "{E} Résultat : {winner}."],
      ],
      signature: [
        [
          "{E} {winner} bat {loser} {methodPhrase} {roundPhrase}.",
          "{E} {winner} bat {loser} {methodPhrase}.",
        ],
        ["{E} Victoire {methodPhrase} pour {winner}.", "{E} Victoire de {winner} face à {loser}."],
        [
          "{E} {winner} prend le meilleur sur {loser}.",
          "{E} {winner} sort vainqueur face à {loser}.",
        ],
      ],
      storytelling: [
        ["{E} Un combat, un vainqueur.", "{E} Le verdict de la cage."],
        ["{E} Ce combat a livré son verdict.", "{E} La cage a rendu son verdict."],
        ["{E} Place au résultat.", "{E} Le combat est terminé."],
      ],
    },
    core: [
      "{winner} bat {loser} {methodPhrase} {roundPhrase}.",
      "{winner} bat {loser} {methodPhrase}.",
      "{winner} bat {loser}.",
    ],
    detail: ["Arrêt à {time}.", "{highlight}"],
    context: [
      "{fighter1} et {fighter2} se retrouvaient dans la cage.",
      "{winner} et {loser} ont livré leur combat.",
    ],
    story: [
      "{highlight}",
      "C'est {winner} qui s'impose {methodPhrase}.",
      "C'est {winner} qui s'impose.",
    ],
  }),
  live({
    categoryId: "live_champion",
    mustMention: ["winner"],
    hooks: {
      punchy: [
        ["{E} LA CEINTURE POUR {WINNER_UPPER} !", "{E} {WINNER_UPPER}, LA CEINTURE !"],
        ["{E} {winner} décroche la ceinture.", "{E} {winner} s'empare de la ceinture."],
        [
          "{E} Nouveau règne chez les {weightClass|lower}.",
          "{E} La ceinture des {weightClass|lower} a trouvé preneur.",
        ],
      ],
      signature: [
        [
          "{E} {winner} s'empare de la ceinture d'HEXAGONE MMA des {weightClass|lower}.",
          "{E} {winner} décroche la ceinture d'HEXAGONE MMA des {weightClass|lower}.",
        ],
        ["{E} La ceinture d'HEXAGONE MMA des {weightClass|lower} revient à {winner}."],
        [
          "{E} {winner} prend la ceinture face à {loser}.",
          "{E} Face à {loser}, {winner} repart avec la ceinture.",
        ],
      ],
      storytelling: [
        ["{E} Une ceinture, ça se va chercher.", "{E} Le sommet de la catégorie a un nom."],
        ["{E} Le moment que tout combattant attend."],
        ["{E} Ce soir, une ceinture a trouvé preneur.", "{E} Le haut de la catégorie a parlé."],
      ],
    },
    core: [
      "{winner} remporte la ceinture d'HEXAGONE MMA des {weightClass|lower} face à {loser} {methodPhrase} {roundPhrase}.",
      "{winner} remporte la ceinture d'HEXAGONE MMA des {weightClass|lower} {methodPhrase}.",
      "{winner} remporte la ceinture d'HEXAGONE MMA des {weightClass|lower}.",
    ],
    detail: ["{highlight}", "Arrêt à {time}."],
    context: [
      "{winner} a arraché la ceinture face à {loser}.",
      "La ceinture des {weightClass|lower} était en jeu, {winner} l'a prise.",
    ],
    story: [
      "{highlight}",
      "La ceinture d'HEXAGONE MMA des {weightClass|lower} appartient désormais à {winner}.",
    ],
  }),
  live({
    categoryId: "live_defense",
    mustMention: ["champion"],
    hooks: {
      punchy: [
        ["{E} {CHAMPION_UPPER} GARDE LA CEINTURE !", "{E} {champion} garde la ceinture !"],
        ["{E} Toujours au sommet : {champion}.", "{E} La ceinture reste à {champion}."],
        ["{E} Ceinture conservée !", "{E} Rien ne change au sommet."],
      ],
      signature: [
        [
          "{E} {champion} conserve la ceinture d'HEXAGONE MMA des {weightClass|lower} face à {challenger}.",
          "{E} {champion} conserve la ceinture d'HEXAGONE MMA des {weightClass|lower}.",
        ],
        [
          "{E} {defenseLabel|cap} réussie pour {champion}.",
          "{E} Défense de titre réussie pour {champion}.",
        ],
        ["{E} {challenger} repart sans la ceinture : {champion} reste au sommet."],
      ],
      storytelling: [
        [
          "{E} Garder une ceinture, c'est encore plus dur que la gagner.",
          "{E} Le sommet se défend.",
        ],
        ["{E} Pas de changement au sommet.", "{E} La ceinture ne bouge pas."],
        ["{E} Défendre, encore.", "{E} Le titre tient bon."],
      ],
    },
    core: [
      "{champion} bat {challenger} {methodPhrase} {roundPhrase} et conserve la ceinture d'HEXAGONE MMA des {weightClass|lower}.",
      "{champion} bat {challenger} et conserve la ceinture d'HEXAGONE MMA des {weightClass|lower}.",
    ],
    detail: ["{defenseLabel|cap} de titre.", "{highlight}"],
    context: ["{challenger} venait chercher la ceinture. {champion} ne l'a pas lâchée."],
    story: ["{highlight}", "Au bout du combat, la ceinture reste à {champion}."],
  }),
  live({
    categoryId: "live_defeat",
    mustMention: ["fighter"],
    closing: ["Respect aux deux combattants."],
    hooks: {
      punchy: [
        ["{E} Revers pour {fighter} ce soir.", "{E} Défaite de {fighter} ce soir."],
        ["{E} {fighter} s'incline face à {opponent}."],
        ["{E} Ce n'était pas le soir de {fighter}."],
      ],
      signature: [
        [
          "{E} {fighter} s'incline face à {opponent} {methodPhrase} {roundPhrase}.",
          "{E} {fighter} s'incline face à {opponent}.",
        ],
        ["{E} Revers pour {fighter} face à {opponent}."],
        ["{E} {opponent} prend le dessus sur {fighter}."],
      ],
      storytelling: [
        ["{E} Il y a des soirs plus durs que d'autres."],
        ["{E} Le combat fait partie du chemin."],
        ["{E} Tout le respect pour l'engagement."],
      ],
    },
    core: [
      "{fighter} s'incline face à {opponent} {methodPhrase}.",
      "{fighter} s'incline face à {opponent}.",
    ],
    detail: ["{highlight}"],
    context: ["Tout notre respect à {fighter} pour ce combat face à {opponent}."],
    story: ["{highlight}", "La cage attend déjà son retour."],
  }),
  live({
    categoryId: "live_walkout",
    mustMention: ["fighter"],
    hooks: {
      punchy: [
        ["{E} {FIGHTER_UPPER} ENTRE DANS LA CAGE !", "{E} {fighter} arrive !"],
        ["{E} Place à {fighter}.", "{E} Voilà {fighter}."],
        ["{E} Ça va commencer.", "{E} C'est l'heure."],
      ],
      signature: [
        ["{E} {fighter} fait son entrée face à {opponent}.", "{E} {fighter} fait son entrée."],
        ["{E} Entrée de {fighter}, {opponent} attend dans la cage."],
        ["{E} {fighter} rejoint la cage.", "{E} {fighter} marche vers la cage."],
      ],
      storytelling: [
        ["{E} La marche vers la cage, le moment où tout se joue dans la tête."],
        ["{E} Dernière ligne droite avant le combat."],
        ["{E} Le silence avant le bruit."],
      ],
    },
    core: ["{fighter} rejoint la cage pour affronter {opponent}.", "{fighter} rejoint la cage."],
    detail: ["{highlight}"],
    context: ["En face, {opponent}.", "Le combat contre {opponent} approche."],
    story: ["{highlight}", "Le combat peut commencer."],
  }),
  live({
    categoryId: "live_crowd",
    mustMention: ["highlight"],
    hooks: {
      punchy: [
        ["{E} Quelle ambiance !"],
        ["{E} Le public répond présent."],
        ["{E} Écoutez cette salle."],
      ],
      signature: [
        ["{E} L'ambiance monte à {venue}.", "{E} L'ambiance monte à {eventLabel}."],
        ["{E} {eventLabel} vibre.", "{E} La salle vibre."],
        ["{E} L'ambiance monte d'un cran."],
      ],
      storytelling: [
        ["{E} Une soirée de combats, c'est aussi une salle."],
        ["{E} Ce bruit-là, on ne l'entend qu'ici."],
        ["{E} Merci au public."],
      ],
    },
    core: ["{highlight}"],
    context: [
      "Le public de {eventLabel} pousse derrière chaque combattant.",
      "Le public pousse derrière chaque combattant.",
    ],
    story: ["Continuez comme ça, la soirée n'est pas finie."],
  }),
  live({
    categoryId: "live_faceoff",
    mustMention: ["fighter1", "fighter2"],
    hooks: {
      punchy: [
        ["{E} {FIGHTER1_UPPER} / {FIGHTER2_UPPER}", "{E} Face à face."],
        ["{E} Les regards se croisent.", "{E} Yeux dans les yeux."],
        ["{E} Ça chauffe."],
      ],
      signature: [
        ["{E} Face-à-face entre {fighter1} et {fighter2}."],
        ["{E} {fighter1} et {fighter2} se font face."],
        ["{E} Face-à-face avant le combat."],
      ],
      storytelling: [
        ["{E} Avant les coups, il y a les regards."],
        ["{E} Tout est dit sans un mot."],
        ["{E} Le combat commence avant la cloche."],
      ],
    },
    core: [
      "{fighter1} et {fighter2} se sont fait face.",
      "Face-à-face entre {fighter1} et {fighter2}.",
    ],
    detail: ["{highlight}"],
    context: ["{fighter1} d'un côté, {fighter2} de l'autre."],
    story: ["{highlight}", "Rendez-vous dans la cage."],
  }),
  live({
    categoryId: "live_reaction",
    mustMention: ["fighter", "quote"],
    coreBlock: "Q",
    hooks: {
      punchy: [["{E} « {quote} »"], ["{E} {fighter} au micro."], ["{E} Les mots de {fighter}."]],
      signature: [
        ["{E} « {quote} »"],
        ["{E} {fighter} a pris la parole."],
        ["{E} La réaction de {fighter}."],
      ],
      storytelling: [
        ["{E} Les mots comptent autant que les coups."],
        ["{E} Écoutez {fighter}."],
        ["{E} Une voix, un moment."],
      ],
    },
    core: ["« {quote} »"],
    detail: ["{fighter}, {context}.", "{fighter}."],
    context: ["{fighter}, {context}.", "{fighter} a pris la parole."],
    story: ["Les mots de {fighter}, à chaud.", "La parole est à {fighter}."],
    quote: ["« {quote} »"],
  }),
  live({
    categoryId: "live_moment",
    mustMention: ["highlight"],
    hooks: {
      punchy: [["{E} Quel moment !"], ["{E} Arrêt sur image."], ["{E} Gros moment dans la cage."]],
      signature: [
        ["{E} Le moment fort de {eventLabel}.", "{E} Le moment fort de la soirée."],
        ["{E} {fightersList} : le moment à retenir.", "{E} Le moment à retenir."],
        ["{E} À retenir de la soirée."],
      ],
      storytelling: [
        ["{E} Certains instants restent."],
        ["{E} Ce qu'on retiendra de ce passage."],
        ["{E} Une image de la soirée."],
      ],
    },
    core: ["{highlight}"],
    context: ["{fightersList} au cœur de l'action.", "Dans la cage, ça bouge."],
    story: ["La soirée continue sur ce rythme."],
  }),
];
