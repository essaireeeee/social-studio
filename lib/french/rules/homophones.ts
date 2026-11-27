/** Homophones grammaticaux (section 6.3, niveau 1). */
import { FEMININE_NOUNS } from "../lexicon";
import { AP, B, E, S, SENTENCE_START, alt } from "../text";
import { INFINITIVE, PARTICIPLE, r, regex, rule } from "./helpers";

const base = { family: "homophones", level: 1, severity: "error", confidence: "high" } as const;
const FEM = alt(FEMININE_NOUNS);

/** Garde l'apostrophe d'origine : « c'et » → « c'est », « c’et » → « c’est ». */
const withApostrophe = (word: string) => (m: RegExpExecArray) => {
  const ap = /[’]/.test(m[0]) ? "’" : "'";
  const fixed = word.replace("'", ap);
  return /^\p{Lu}/u.test(m[0]) ? fixed.charAt(0).toUpperCase() + fixed.slice(1) : fixed;
};

export const HOMOPHONE_RULES = [
  rule({
    ...base,
    id: "homo-a-sujet",
    title: "« a » (verbe avoir) après il, elle, on",
    explanation:
      "Après il, elle ou on, c'est le verbe avoir : « a », sans accent. Astuce : remplacez par « avait », si la phrase tient, il faut « a ».",
    examples: [
      {
        wrong: "Il à gagné par KO au premier round.",
        right: "Il a gagné par KO au premier round.",
      },
      { wrong: "On à vu un grand combat ce soir.", right: "On a vu un grand combat ce soir." },
    ],
    alsoRight: ["Il pense à sa revanche.", "Elle s'entraîne à Paris."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on)${S})à(?=${S}(?:${PARTICIPLE}|un|une|des|du|été|eu|déjà|toujours|encore|bien|tout|fait|dit|pris|mis|su|vu|pu|dû)${E})`,
      "a",
    ),
  }),
  rule({
    ...base,
    id: "homo-a-infinitif",
    title: "« à » (préposition) devant un infinitif",
    explanation:
      "Devant un verbe à l'infinitif, après « prêt », « cherche » ou « réussi », il faut la préposition « à ». Le verbe avoir « a » ne peut pas introduire un infinitif.",
    examples: [
      { wrong: "Il est prêt a combattre.", right: "Il est prêt à combattre." },
      { wrong: "Il cherche a imposer son rythme.", right: "Il cherche à imposer son rythme." },
    ],
    alsoRight: ["Il a combattu avec cœur.", "Il pense à gagner."],
    detect: regex(
      r`(?<=${B}(?:prêt|prête|prêts|prêtes|apte|aptes|décidé|décidée|déterminé|déterminée|habitué|habituée|commence|continue|cherche|pense|réussi|parvient|arrive|apprend|invite|aide|tient|hésite)${S})a(?=${S}${INFINITIVE}${E})`,
      "à",
    ),
  }),
  rule({
    ...base,
    id: "homo-a-locution",
    title: "« à » dans à nouveau, à suivre, à venir, à partir de",
    explanation:
      "Ces locutions s'écrivent toujours avec la préposition « à ». On ne peut pas y remplacer « a » par « avait ».",
    examples: [
      { wrong: "Il revient a nouveau dans la cage.", right: "Il revient à nouveau dans la cage." },
      { wrong: "Les détails a suivre.", right: "Les détails à suivre." },
    ],
    alsoRight: ["Il a suivi son plan.", "À suivre !"],
    detect: regex(
      r`${B}a(?=${S}(?:nouveau|suivre|venir|partir|bientôt|guichets fermés|huis clos)${E})`,
      "à",
    ),
  }),
  rule({
    ...base,
    id: "homo-ou-relatif",
    title: "« où » après au moment, le jour, l'instant",
    explanation:
      "Pour indiquer un lieu ou un moment, « où » prend un accent grave. « Ou » sans accent signifie « ou bien ».",
    examples: [
      {
        wrong: "Au moment ou il a frappé, la salle s'est levée.",
        right: "Au moment où il a frappé, la salle s'est levée.",
      },
      {
        wrong: "Le jour ou il a remporté la ceinture.",
        right: "Le jour où il a remporté la ceinture.",
      },
    ],
    alsoRight: ["KO au premier round ou décision des juges ?"],
    detect: regex(
      r`(?<=${B}(?:au moment|le jour|la nuit|le soir|l${AP}instant|l${AP}endroit|à l${AP}heure)${S})ou(?=${S})`,
      "où",
    ),
  }),
  rule({
    ...base,
    id: "homo-ou-dou",
    title: "« d'où », « jusqu'où », « par où »",
    explanation:
      "« D'où », « jusqu'où » et « par où » désignent un lieu : accent grave. Remplacez par « ou bien » : si c'est absurde, il faut « où ».",
    examples: [
      { wrong: "D'ou vient ce crochet ?", right: "D'où vient ce crochet ?" },
      { wrong: "Jusqu'ou ira-t-il ?", right: "Jusqu'où ira-t-il ?" },
    ],
    alsoRight: ["Victoire ou défaite, il reviendra."],
    detect: regex(
      r`(?<=${B}(?:d|jusqu)${AP})ou${E}|(?<=${B}par${S})ou(?=${S}(?:passer|commencer|aller|sortir)${E})`,
      "où",
    ),
  }),
  rule({
    ...base,
    id: "homo-ou-choix",
    title: "« ou » (choix) dans ou bien, ou alors, plus ou moins",
    explanation:
      "Quand on peut dire « ou bien », c'est la conjonction « ou », sans accent. L'accent grave est réservé au lieu et au moment.",
    examples: [
      {
        wrong: "Victoire où bien défaite, il reviendra.",
        right: "Victoire ou bien défaite, il reviendra.",
      },
      { wrong: "Il était plus où moins prêt.", right: "Il était plus ou moins prêt." },
    ],
    alsoRight: ["Où est le vestiaire ?"],
    detect: regex(r`${B}où(?=${S}(?:bien|alors)${E})|(?<=${B}plus${S})où(?=${S}moins${E})`, "ou"),
  }),
  rule({
    ...base,
    id: "homo-cest",
    title: "« c'est » et non « c'et »",
    explanation:
      "« C'est » est la contraction de « cela est » : il faut le verbe être, « est ». « C'et » n'existe pas.",
    examples: [
      { wrong: "C'et le main event de la soirée.", right: "C'est le main event de la soirée." },
      { wrong: "Ce soir, c'et la revanche.", right: "Ce soir, c'est la revanche." },
    ],
    detect: regex(r`${B}c${AP}et${E}`, withApostrophe("c'est")),
  }),
  rule({
    ...base,
    id: "homo-est-sujet",
    title: "« est » (verbe être) après il, elle, on",
    explanation:
      "Après il, elle ou on, devant un adjectif ou un lieu, c'est le verbe être : « est ». Astuce : remplacez par « était ».",
    examples: [
      { wrong: "Il et prêt pour la revanche.", right: "Il est prêt pour la revanche." },
      { wrong: "Elle et de retour dans la cage.", right: "Elle est de retour dans la cage." },
    ],
    alsoRight: ["Lui et elle seront là."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on)${S})et(?=${S}(?:prêt|prête|là|de retour|invaincu|invaincue|champion|championne|déjà|toujours|très|bien|en forme)${E})`,
      "est",
    ),
  }),
  rule({
    ...base,
    id: "homo-sont-sujet",
    title: "« sont » (verbe être) après ils, elles",
    explanation:
      "Après ils ou elles, c'est le verbe être conjugué : « sont ». « Son » est un déterminant (son coach, son titre).",
    examples: [
      { wrong: "Ils son prêts pour le choc.", right: "Ils sont prêts pour le choc." },
      { wrong: "Elles son arrivées à la pesée.", right: "Elles sont arrivées à la pesée." },
    ],
    alsoRight: ["Il soigne son cardio."],
    detect: regex(r`(?<=${B}(?:ils|elles)${S})son${E}`, "sont"),
  }),
  rule({
    ...base,
    id: "homo-son-determinant",
    title: "« son » (déterminant) après une préposition",
    explanation:
      "Après « avec », « pour » ou « contre », il faut un déterminant : « son » (son coach, son rival). « Sont » est le verbe être.",
    examples: [
      { wrong: "Il est venu avec sont coach.", right: "Il est venu avec son coach." },
      {
        wrong: "Il prépare sa revanche contre sont rival.",
        right: "Il prépare sa revanche contre son rival.",
      },
    ],
    alsoRight: ["Ils sont prêts.", "Les places sont parties."],
    detect: regex(
      r`(?<=${B}(?:avec|pour|de|dans|par|sur|contre|chez|vers|après|avant)${S})sont(?=${S}\p{L})`,
      "son",
    ),
  }),
  rule({
    ...base,
    id: "homo-ont-sujet",
    title: "« ont » (verbe avoir) après ils, elles",
    explanation:
      "Après ils ou elles, c'est le verbe avoir : « ont ». Astuce : remplacez par « avaient ».",
    examples: [
      { wrong: "Ils on livré un combat énorme.", right: "Ils ont livré un combat énorme." },
      { wrong: "Elles on tout donné.", right: "Elles ont tout donné." },
    ],
    alsoRight: ["On a tout donné."],
    detect: regex(r`(?<=${B}(?:ils|elles)${S})on${E}`, "ont"),
  }),
  rule({
    ...base,
    id: "homo-on-pronom",
    title: "« on » (pronom) devant un verbe",
    explanation:
      "« On » est un pronom sujet, suivi d'un verbe au singulier (on a, on va). « Ont » est le verbe avoir.",
    examples: [
      { wrong: "Ont a vu un KO incroyable.", right: "On a vu un KO incroyable." },
      { wrong: "Ce soir, ont va vibrer.", right: "Ce soir, on va vibrer." },
    ],
    alsoRight: ["Ils ont vu un KO incroyable.", "Les fans ont fait le déplacement."],
    detect: regex(
      r`${B}ont(?=${S}(?:(?:a|va|est|peut|doit|sait|veut|vient|attend|sera|aura|ne)${E}|n${AP}))`,
      "on",
    ),
  }),
  rule({
    ...base,
    id: "homo-ce-determinant",
    title: "« ce » (déterminant) devant soir, combat, gala",
    explanation:
      "Devant un nom (ce soir, ce combat), il faut le déterminant « ce ». « Se » accompagne un verbe pronominal (il se bat).",
    examples: [
      { wrong: "Se soir, la cage s'enflamme.", right: "Ce soir, la cage s'enflamme." },
      { wrong: "Il veut remporter se combat.", right: "Il veut remporter ce combat." },
    ],
    alsoRight: ["Il se bat ce soir.", "Ils se combattent depuis 2019."],
    detect: regex(
      r`${B}se(?=${S}(?:(?:soir|combat|samedi|dimanche|vendredi|week-end|gala|titre|moment|matin|choc|duel|round)${E}|n${AP}est${E}))`,
      "ce",
    ),
  }),
  rule({
    ...base,
    id: "homo-se-pronominal",
    title: "« se » devant un verbe pronominal",
    explanation:
      "Devant un verbe (il se prépare, ils se sont imposés), c'est le pronom « se ». « Ce » se place devant un nom.",
    examples: [
      { wrong: "Il ce prépare pour le main event.", right: "Il se prépare pour le main event." },
      { wrong: "Ils ce sont imposés aux points.", right: "Ils se sont imposés aux points." },
    ],
    alsoRight: ["Elle se prépare."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on|ils|elles)${S})ce(?=${S}(?:prépare|préparent|bat|battent|blesse|retrouve|retrouvent|qualifie|qualifient|relève|relèvent|lance|lancent|présente|présentent|souvient|rappelle|sent|sentent|sont|est|impose|imposent|déroule|tient|tiennent|voit|voient)${E})`,
      "se",
    ),
  }),
  rule({
    ...base,
    id: "homo-sest-sujet",
    title: "« s'est » après il, elle, on",
    explanation:
      "Devant un participe (il s'est imposé), c'est le pronom « se » suivi de « est » : « s'est ». « C'est » signifie « cela est ».",
    examples: [
      { wrong: "Il c'est imposé par décision.", right: "Il s'est imposé par décision." },
      {
        wrong: "Elle c'est blessée à l'entraînement.",
        right: "Elle s'est blessée à l'entraînement.",
      },
    ],
    alsoRight: ["Il pense que c'est fini."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on)${S})c${AP}est(?=${S}${PARTICIPLE}${E})`,
      withApostrophe("s'est"),
    ),
  }),
  rule({
    ...base,
    id: "homo-sait",
    title: "« sait » (verbe savoir) devant que",
    explanation:
      "« On sait que », « il sait que » : c'est le verbe savoir. « C'est » ne peut pas introduire « que » après un sujet.",
    examples: [
      { wrong: "On c'est que la revanche arrive.", right: "On sait que la revanche arrive." },
      { wrong: "Il c'est qu'il devra frapper fort.", right: "Il sait qu'il devra frapper fort." },
    ],
    alsoRight: ["On sait que la revanche arrive."],
    detect: regex(r`(?<=${B}(?:on|il|elle)${S})c${AP}est(?=${S}qu(?:e${E}|${AP}))`, "sait"),
  }),
  rule({
    ...base,
    id: "homo-cest-debut",
    title: "« c'est » en début de phrase",
    explanation:
      "En début de phrase, devant un nom ou « parti », on écrit « c'est » (cela est). « S'est » suit toujours un sujet (il s'est imposé).",
    examples: [
      { wrong: "S'est le grand soir !", right: "C'est le grand soir !" },
      { wrong: "Ce soir, s'est parti pour le gala.", right: "Ce soir, c'est parti pour le gala." },
    ],
    alsoRight: ["Il s'est imposé.", "Elle s'est blessée."],
    detect: regex(
      r`(?:${SENTENCE_START}|(?<=,${S}))s${AP}est(?=${S}(?:(?:le|la|les|un|une|pour|ce|demain|officiel|maintenant|ici|là|bientôt|parti|son|sa|ses|notre)${E}|l${AP}))`,
      withApostrophe("c'est"),
      { flags: "gimu" },
    ),
  }),
  rule({
    ...base,
    id: "homo-ca-pronom",
    title: "« ça » (cela) devant va, fait, commence",
    explanation:
      "« Ça » est le pronom démonstratif (cela) : ça va, ça commence. « Sa » est un déterminant (sa ceinture).",
    examples: [
      { wrong: "Sa va chauffer ce soir !", right: "Ça va chauffer ce soir !" },
      { wrong: "Dans la cage, sa commence fort.", right: "Dans la cage, ça commence fort." },
    ],
    alsoRight: ["Sa frappe est lourde.", "Sa passe décisive a fait la différence."],
    detect: regex(
      r`${B}sa(?=${S}(?:va|fait|y est|commence|se joue|arrive|repart|chauffe|devient|suffit|promet|cogne)${E})`,
      "ça",
    ),
  }),
  rule({
    ...base,
    id: "homo-sa-determinant",
    title: "« sa » (déterminant) devant un nom",
    explanation:
      "Devant un nom (sa ceinture, sa victoire), il faut le déterminant possessif « sa ». « Ça » signifie « cela ».",
    examples: [
      { wrong: "Il défend ça ceinture ce soir.", right: "Il défend sa ceinture ce soir." },
      {
        wrong: "Il a fêté ça victoire avec le public.",
        right: "Il a fêté sa victoire avec le public.",
      },
    ],
    alsoRight: ["Ça va être énorme."],
    detect: regex(
      r`${B}ça(?=${S}(?:ceinture|victoire|carrière|revanche|défaite|garde|préparation|famille|catégorie|place|première|dernière|soumission|droite|gauche|technique|ascension)${E})`,
      "sa",
    ),
  }),
  rule({
    ...base,
    id: "homo-la-bas",
    title: "« là-bas » avec accent et trait d'union",
    explanation:
      "« Là » adverbe de lieu prend un accent grave, et « là-bas » un trait d'union. « La » sans accent est un article.",
    examples: [
      { wrong: "On se retrouve la-bas samedi.", right: "On se retrouve là-bas samedi." },
      {
        wrong: "Il s'entraîne la bas depuis six mois.",
        right: "Il s'entraîne là-bas depuis six mois.",
      },
    ],
    alsoRight: ["Là-bas, tout est prêt."],
    detect: regex(r`${B}la[ -]bas${E}`, "là-bas"),
  }),
  rule({
    ...base,
    id: "homo-ce-soir-la",
    title: "« ce soir-là », « cette nuit-là »",
    explanation:
      "Après un nom précédé de « ce » ou « cette », « là » s'accroche par un trait d'union et prend un accent : ce soir-là.",
    examples: [
      { wrong: "Ce soir la, il a tout donné.", right: "Ce soir-là, il a tout donné." },
      {
        wrong: "Il s'en souvient, de cette soirée la.",
        right: "Il s'en souvient, de cette soirée-là.",
      },
    ],
    alsoRight: ["Ce soir, la cage est pleine."],
    detect: regex(
      r`(?<=${B}(?:ce|cette)${S}(?:soir|jour|nuit|moment|combat|fois|semaine|année|époque|heure|soirée)) la(?=[   ]*(?:[.!?,…]|$))`,
      "-là",
      { flags: "gimu" },
    ),
  }),
  rule({
    ...base,
    id: "homo-leur-pronom",
    title: "« leur » (pronom) devant un verbe : jamais de s",
    explanation:
      "Devant un verbe, « leur » est un pronom (on leur souhaite) et ne prend jamais de s. Seul le déterminant s'accorde (leurs gants).",
    examples: [
      {
        wrong: "Le public leurs a réservé une ovation.",
        right: "Le public leur a réservé une ovation.",
      },
      { wrong: "On leurs souhaite bonne chance.", right: "On leur souhaite bonne chance." },
    ],
    alsoRight: ["Leurs gants sont prêts."],
    detect: regex(
      r`${B}leurs(?=${S}(?:a|ont|dit|donne|offre|souhaite|souhaitons|montre|rend|réserve|promet|demande|doit|doivent|répond|explique)${E})`,
      "leur",
    ),
  }),
  rule({
    ...base,
    id: "homo-leurs-determinant",
    confidence: "medium",
    severity: "warning",
    title: "« leurs » devant un nom pluriel",
    explanation:
      "Le déterminant « leur » s'accorde avec le nom : leurs fans, leurs ceintures. Vérifiez qu'il y en a bien plusieurs.",
    examples: [
      { wrong: "Ils ont soulevé leur ceintures.", right: "Ils ont soulevé leurs ceintures." },
      { wrong: "Ils remercient leur fans.", right: "Ils remercient leurs fans." },
    ],
    alsoRight: ["Ils remercient leur public."],
    detect: regex(
      r`${B}leur(?=${S}(?:gants|coachs|équipes|supporters|fans|ceintures|victoires|adversaires|combats|camps|familles|rounds|places|billets)${E})`,
      "leurs",
    ),
  }),
  rule({
    ...base,
    id: "homo-peut-verbe",
    title: "« peut » (pouvoir) devant un infinitif",
    explanation:
      "Devant un infinitif, c'est le verbe pouvoir : « il peut gagner ». « Peu » signifie « pas beaucoup ».",
    examples: [
      { wrong: "Il peu gagner ce combat.", right: "Il peut gagner ce combat." },
      { wrong: "Tout peu basculer en un coup.", right: "Tout peut basculer en un coup." },
    ],
    alsoRight: ["Il a peu dormi.", "Il peut gagner."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on|qui|ça|cela|tout|rien)${S})peu(?=${S}(?:${INFINITIVE}|être|faire|y)${E})`,
      "peut",
    ),
  }),
  rule({
    ...base,
    id: "homo-peu-adverbe",
    title: "« peu » (adverbe) après un, très, sous",
    explanation:
      "« Un peu », « très peu », « sous peu » : c'est l'adverbe de quantité, sans t. « Peut » est le verbe pouvoir.",
    examples: [
      { wrong: "Il était un peut nerveux.", right: "Il était un peu nerveux." },
      { wrong: "Le combat commence sous peut.", right: "Le combat commence sous peu." },
    ],
    alsoRight: ["Il peut le faire.", "Un peu de patience."],
    detect: regex(
      r`(?<=${B}(?:un|très|si|trop|assez|à|quelque|depuis|sous|pour|tant)${S})peut${E}`,
      "peu",
    ),
  }),
  rule({
    ...base,
    id: "homo-quant-a",
    title: "« quant à » (en ce qui concerne)",
    explanation:
      "« Quant à », « quant au » signifient « en ce qui concerne » et s'écrivent avec un t. « Quand » exprime le temps.",
    examples: [
      {
        wrong: "Quand à la revanche, elle aura lieu.",
        right: "Quant à la revanche, elle aura lieu.",
      },
      { wrong: "Quand au titre, il reste en jeu.", right: "Quant au titre, il reste en jeu." },
    ],
    alsoRight: ["Quand il frappe, ça fait mal."],
    detect: regex(r`${B}quand(?=${S}(?:à|au|aux)${E})`, "quant"),
  }),
  rule({
    ...base,
    id: "homo-quand-temps",
    title: "« quand » (moment) devant un sujet",
    explanation:
      "Pour dire « au moment où », on écrit « quand », avec un d. « Quant » ne s'emploie que dans « quant à ».",
    examples: [
      { wrong: "Quant il frappe, ça fait mal.", right: "Quand il frappe, ça fait mal." },
      {
        wrong: "Il revient quant le public l'appelle.",
        right: "Il revient quand le public l'appelle.",
      },
    ],
    alsoRight: ["Quant à lui, il reste serein."],
    detect: regex(
      r`${B}quant(?=${S}(?:il|elle|on|ils|elles|je|tu|nous|vous|le|la|les|un|une|ce|son|sa)${E})`,
      "quand",
    ),
  }),
  rule({
    ...base,
    id: "homo-quelle-exclamation",
    title: "« quelle » devant un nom féminin",
    explanation:
      "Dans une exclamation (quelle victoire !), c'est le déterminant « quelle ». « Qu'elle » signifie « que elle ».",
    examples: [
      { wrong: "Qu'elle victoire pour Karim !", right: "Quelle victoire pour Karim !" },
      { wrong: "Qu'elle soirée à Paris !", right: "Quelle soirée à Paris !" },
    ],
    alsoRight: ["Qu'elle gagne ou perde, elle revient."],
    detect: regex(r`${B}qu${AP}elle(?=${S}(?:${FEM})${E})`, "quelle"),
  }),
  rule({
    ...base,
    id: "homo-sen",
    title: "« s'en » devant un verbe",
    explanation:
      "Devant un verbe (il s'en sort, elle s'en souvient), c'est « se » suivi de « en ». « Sans » marque l'absence.",
    examples: [
      { wrong: "Il sans sort avec une coupure.", right: "Il s'en sort avec une coupure." },
      { wrong: "Elle sans souvient encore.", right: "Elle s'en souvient encore." },
    ],
    alsoRight: ["Il gagne sans forcer."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on|ils|elles|qui)${S})sans(?=${S}(?:va|vont|sort|sortent|souvient|souviennent|prend|prennent|tire|tirent|remet|remettent|occupe|occupent|charge|souviendra)${E})`,
      "s'en",
    ),
  }),
  rule({
    ...base,
    id: "homo-sans",
    title: "« sans » (absence) devant un nom",
    explanation:
      "Pour dire l'absence (sans faute, sans répit), on écrit « sans ». « S'en » accompagne un verbe pronominal.",
    examples: [
      { wrong: "Une victoire s'en faute.", right: "Une victoire sans faute." },
      { wrong: "Un combat s'en répit.", right: "Un combat sans répit." },
    ],
    alsoRight: ["Il s'en souvient."],
    detect: regex(
      r`${B}s${AP}en(?=${S}(?:faute|limite|fin|répit|relâche|discussion|pitié|appel)${E})`,
      "sans",
    ),
  }),
  rule({
    ...base,
    id: "homo-ny",
    title: "« n'y » (il n'y a)",
    explanation:
      "« Il n'y a » associe la négation « n' » et le pronom « y ». « Ni » sert à coordonner deux négations (ni vu ni connu).",
    examples: [
      { wrong: "Il ni a pas de favori.", right: "Il n'y a pas de favori." },
      { wrong: "On ni croit plus.", right: "On n'y croit plus." },
    ],
    alsoRight: ["Ni vu ni connu."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on)${S})ni(?=${S}(?:a|avait|aura|aurait|est|croit|pense|va)${E})`,
      "n'y",
    ),
  }),
  rule({
    ...base,
    id: "homo-sy",
    title: "« s'y » devant un verbe",
    explanation:
      "« Il s'y prépare » : pronom « se » suivi de « y ». « Si » exprime une condition ou une intensité.",
    examples: [
      { wrong: "Il si prépare depuis des mois.", right: "Il s'y prépare depuis des mois." },
      { wrong: "Elle si attend.", right: "Elle s'y attend." },
    ],
    alsoRight: ["Il est si rapide."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on|ils|elles)${S})si(?=${S}(?:prépare|préparent|attend|attendent|connaît|connaissent|trouve|trouvent|met|mettent|plaît|rend|rendent|voit)${E})`,
      "s'y",
    ),
  }),
  rule({
    ...base,
    id: "homo-den",
    title: "« d'en » devant un infinitif (d'en découdre)",
    explanation:
      "Devant un infinitif, on écrit « d'en » (de + en) : pressé d'en finir. « Dans » introduit un lieu.",
    examples: [
      { wrong: "Il est pressé dans finir.", right: "Il est pressé d'en finir." },
      { wrong: "Ils ont hâte dans découdre.", right: "Ils ont hâte d'en découdre." },
    ],
    alsoRight: ["Il entre dans la cage."],
    detect: regex(r`${B}dans(?=${S}(?:finir|découdre|profiter|parler|sortir|venir)${E})`, "d'en"),
  }),
  rule({
    ...base,
    id: "homo-mais",
    title: "« mais » (opposition)",
    explanation:
      "Pour marquer une opposition, on écrit « mais ». « Mes » est un déterminant possessif (mes coachs).",
    examples: [
      { wrong: "Il a souffert, mes il a tenu.", right: "Il a souffert, mais il a tenu." },
      {
        wrong: "Il a perdu, mes pas sans se battre.",
        right: "Il a perdu, mais pas sans se battre.",
      },
    ],
    alsoRight: ["Merci à mes coachs."],
    detect: regex(
      r`${B}mes(?=${S}(?:(?:il|elle|on|ils|elles|je|tu|nous|vous|pas|aussi|encore|surtout|attention)${E}|c${AP}))`,
      "mais",
    ),
  }),
  rule({
    ...base,
    id: "homo-on-negation",
    title: "« on n'a jamais » : la négation ne disparaît pas",
    explanation:
      "Avec « jamais », « pas » ou « rien », la négation demande « ne » : on n'a jamais vu ça. À l'oral la liaison masque le « n' », à l'écrit il est obligatoire.",
    examples: [
      { wrong: "On a jamais vu ça.", right: "On n'a jamais vu ça." },
      { wrong: "On lâche rien !", right: "On ne lâche rien !" },
    ],
    alsoRight: ["On n'a jamais vu ça.", "On a plus de temps que prévu."],
    detect: regex(
      r`(?<=${B}on${S})(?:a|avait|aura|est|était|sera|peut|pouvait|veut|va|sait|lâche|oublie|oubliera|attend)(?=${S}(?:jamais|pas|rien|personne|guère)${E})`,
      (m) => (/^[aeéèêiouyh]/i.test(m[0]) ? `n'${m[0]}` : `ne ${m[0]}`),
    ),
  }),
];
