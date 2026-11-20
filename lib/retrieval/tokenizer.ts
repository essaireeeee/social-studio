/** Découpage en termes pour la recherche : mots normalisés, sans mots vides. Logique pure. */
import { isStopword } from "@/lib/editorial/stopwords-fr";
import { tokenizeWords } from "@/lib/editorial/text-utils";

export function tokenize(text: string): string[] {
  return tokenizeWords(text).filter((word) => word.length >= 2 && !isStopword(word));
}
