/**
 * Mots vides français, déjà normalisés (minuscules, sans accents) pour être comparés
 * aux mots produits par `tokenizeWords`. Utilisés pour le vocabulaire et les n-grammes.
 */
const WORDS = `
a ai aie aient aies ait alors as au aucun aucune aupres auquel aura aurai auraient aurais
aurait auras aurez auriez aurions aurons auront aussi autre autres aux auxquelles auxquels
avaient avais avait avant avec avez aviez avions avoir avons ayant ayez ayons
bien c ca car ce ceci cela celle celles celui cependant certes ces cet cette ceux chacun
chacune chaque chez ci comme comment contre d dans de depuis des desquelles desquels deja
deux dont du duquel e elle elles en encore entre es est et etaient etais etait etant etc
ete etes etiez etions etre eu eue eues eurent eus eusse eut eux fait faire fais font fut
ici il ils j je jusqu jusque l la laquelle le lequel les lesquelles lesquels leur leurs lors
lorsque lui m ma mais malgre me meme memes mes moi moins mon n ne ni non nos notre nous o
on ont or ou par parce parmi pas pendant peu peut peuvent plus plutot pour pourquoi pourtant
puis puisque qu quand que quel quelle quelles quels qui quoi s sa sans se selon sera serai
seraient serais serait seras serez seriez serions serons seront ses si sien sienne siennes
siens soi soient sois soit sommes son sont sous soyez soyons suis sur t ta tandis te tes toi
ton tous tout toute toutes tres tu un une unes uns vers via voici voila vos votre vous y
ainsi apres aujourd hui donc enfin hors juste oui tant tel telle
telles tels toujours trop vraiment
`;

export const STOPWORDS_FR: ReadonlySet<string> = new Set(WORDS.split(/\s+/).filter(Boolean));

export function isStopword(word: string): boolean {
  return STOPWORDS_FR.has(word);
}
