/**
 * Contrôle du bundle client après `npm run build` (critère Phase 6).
 *
 * `grep -r "sk-" .next/static` trouve des occurrences de « mask- » : ce sont les noms de
 * classes CSS de tailwind-merge (mask-image, mask-size...), pas des clés. Ce script fait
 * le même contrôle sans ces faux positifs, et échoue si :
 *   - une chaîne commence par « sk- » hors d'un mot (forme des clés Anthropic et OpenAI) ;
 *   - un SDK ou un hôte de fournisseur IA se retrouve dans le code envoyé au navigateur.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), ".next", "static");
const KEY_SHAPE = /(?<![A-Za-z])sk-[A-Za-z0-9_-]*/g;
const FORBIDDEN = ["api.anthropic.com", "api.openai.com", "@anthropic-ai/sdk", "anthropic-version"];

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else yield full;
  }
}

let literal = 0;
const problems = [];
for await (const file of files(ROOT)) {
  const text = await readFile(file, "utf8");
  literal += text.split("sk-").length - 1;
  for (const match of text.matchAll(KEY_SHAPE)) problems.push(`${file} : « ${match[0]} »`);
  for (const needle of FORBIDDEN) if (text.includes(needle)) problems.push(`${file} : ${needle}`);
}

console.warn(
  `Occurrences littérales de « sk- » : ${literal} (toutes à l'intérieur d'un mot, ex. « mask- »).`,
);
if (problems.length > 0) {
  console.error("Bundle client NON conforme :\n" + problems.join("\n"));
  process.exit(1);
}
console.warn("Bundle client conforme : aucune clé, aucun SDK ni hôte de fournisseur IA.");
