# PROGRESS : HEXAGONE MMA SOCIAL STUDIO

Journal d'avancement. Chaque phase liste ce qui a été livré, les décisions prises et les écarts par rapport à `PROMPT.md`.

| Phase | Intitulé                                        | Statut   |
| ----- | ----------------------------------------------- | -------- |
| 0     | Setup du projet                                 | Terminée |
| 1     | Schéma de données, persistance, exemples        | À faire  |
| 2     | Catégories, règles éditoriales, linter          | À faire  |
| 3     | Intelligence éditoriale (Brand Voice Extractor) | À faire  |
| 4     | Recherche des références                        | À faire  |
| 5     | Moteur natif                                    | À faire  |
| 6     | Moteur IA (Anthropic / OpenAI)                  | À faire  |
| 7     | Shell de l'application                          | À faire  |
| 8     | Social Studio                                   | À faire  |
| 9     | Bibliothèque                                    | À faire  |
| 10    | Combattants, événements, hashtags, signatures   | À faire  |
| 11    | Historique, dashboard, paramètres, données      | À faire  |
| 12    | Tests, QA, README                               | À faire  |

**Prochaine étape : Phase 1.**

---

## Phase 0 : Setup du projet (terminée le 20/11/2026)

### Livré

- Projet Next.js 16.4 (App Router, TypeScript strict, ESLint, Tailwind CSS 4, pas de `src/`, alias `@/*`).
- Dépendances de la section 3.1 installées : zustand, dexie, dexie-react-hooks, zod, papaparse, exceljs, twitter-text, @anthropic-ai/sdk, openai, diff, lucide-react, radix-ui, class-variance-authority, clsx, tailwind-merge, geist. Dev : vitest, @vitejs/plugin-react, jsdom, Testing Library, fake-indexeddb (tests Dexie en Phase 1), @playwright/test, prettier + plugin Tailwind.
- Design system OCTOGON DARK dans `app/globals.css` : tokens bruts sur `:root`, bascule de `--accent` par `html[data-mode]`, exposition à Tailwind via `@theme inline`, rayons, échelle typographique 12/13/14/16/20/24, animation `on-air` (2 s, 60 à 100 %), utilitaire `accent-transition` (150 ms), anneau de focus `--accent`, respect de `prefers-reduced-motion`.
- shadcn/ui configuré : `components.json`, `lib/utils.ts` (`cn`).
- Arborescence de la section 3.3 : dossiers `components/*`, `lib/*`, `types`, `hooks`, `stores`, `tests/{unit,e2e,fixtures}`, chacun avec un `index.ts` qui documente son rôle et sa phase.
- Scripts : `dev`, `build`, `start`, `typecheck`, `lint`, `format` (+ `format:check`), `test` (+ `test:watch`), `test:e2e`.
- `.env.example` conforme à la section 5.6.
- `.gitignore` : variantes `.env*` (dont `.env*.local`) sauf `.env.example`, `/data`, `/playwright-report`, `/test-results`.
- `CLAUDE.md` (règles section 1, conventions 3.4, repères techniques) et ce fichier.
- Page d'accueil vide aux couleurs du thème, `lang="fr"`, `data-mode="live"`, icône hexagonale sobre (`app/icon.svg`).

### Fichiers créés ou modifiés

`PROMPT.md`, `CLAUDE.md`, `PROGRESS.md`, `README.md`, `.env.example`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `components.json`, `eslint.config.mjs`, `package.json`, `tsconfig.json`, `vitest.config.mts`, `playwright.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/icon.svg`, `lib/utils.ts`, `tests/setup.ts`, `tests/unit/setup-phase0.test.ts`, `tests/e2e/phase0-theme.spec.ts`, les `index.ts` de l'arborescence.

### Validation

- `npm run typecheck` : OK.
- `npm run lint` : OK, 0 avertissement.
- `npm run test` : 17 tests OK (fusion de classes, valeur exacte des 14 tokens de la section 4.1, bascule de l'accent par mode).
- `npm run build` : OK.
- `npm run test:e2e` : OK. Le test lance `npm run dev` et vérifie dans Chromium le fond `rgb(10, 11, 14)`, le texte `rgb(243, 244, 246)`, l'accent `#E11D48` en LIVE puis `#D97706` en DAILY, et le chargement de Geist. Aucune erreur console.

### Décisions et écarts

1. **shadcn/ui initialisé à la main.** `npx shadcn init` appelle `ui.shadcn.com`, bloqué par le proxy réseau de l'environnement de développement (HTTP 403). `components.json` et `cn()` ont été écrits à la main, les dépendances Radix installées via le paquet unifié `radix-ui`. Les composants seront copiés dans `components/ui` au fil des phases, adaptés aux tokens. Le champ `style` de `components.json` est indicatif tant que le registre n'est pas joignable.
2. **Sens de `accent` dans les composants shadcn.** Chez shadcn, `accent` désigne une surface de survol. Ici, `accent` et `primary` désignent la couleur du mode actif (section 4.1). Les survols neutres utilisent le token ajouté `--subtle` (`#1A1E26`).
3. **Tokens ajoutés hors liste 4.1** : `--subtle` (survol) et `--accent-fg` (texte posé sur l'accent). Blanc sur `#D97706` donne un contraste de 3,2:1, sous le seuil AA : en DAILY, le texte sur l'accent est `#0A0B0E`. En LIVE, blanc sur `#E11D48` passe l'AA.
4. **Polices.** Geist Sans et Geist Mono via le paquet `geist`, qui s'appuie sur `next/font/local`. Pas de requête à Google Fonts au build ni à l'exécution, ce qui convient à un outil interne utilisable hors ligne. Inter est déclarée en police de secours dans la pile CSS, sans être téléchargée.
5. **`tailwind-merge` étendu** pour reconnaître `text-13` comme une taille. Sans cela, `cn("text-13", "text-muted-foreground")` supprimait la taille (vérifié, couvert par un test).
6. **Pages de routes non créées.** Les dossiers `app/(workspace)/*` et `app/api/*` seront créés dans leur phase respective. Les créer vides maintenant reviendrait à livrer des écrans décoratifs.
7. **`.gitignore` plus large que demandé** : tous les fichiers `.env*` sont ignorés (y compris `.env` qui pourrait contenir une clé), seul `.env.example` est versionné.
8. **Versions.** `@types/node` aligné sur Node 22 (exigé par Vitest 5). ESLint reste en v9, version supportée par `eslint-config-next` 16. `@playwright/test` épinglé en 1.63.0 pour utiliser le Chromium préinstallé de l'environnement. `uuid` forcé en `^11.1.1` via `overrides` pour corriger une vulnérabilité modérée remontée par `exceljs` ; lecture et écriture xlsx vérifiées après le changement. `npm audit` : 0 vulnérabilité.
9. **Next.js 16** : `cacheComponents` et `partialPrefetching` activés par le gabarit officiel, conservés. Le script `typecheck` lance `next typegen` avant `tsc` pour que les types globaux (`LayoutProps`) existent sur un clone neuf. `AGENTS.md` (généré par Next) est versionné et importé depuis `CLAUDE.md`.
10. **Cible TypeScript `ES2022`** (au lieu de ES2017) pour les expressions régulières Unicode (`\p{Extended_Pictographic}`, drapeau `u`) des phases 2 et 3.
11. **Config Vitest en `.mts`** pour éviter l'avertissement de chargement CommonJS de Vite 8.

### Points d'attention pour la suite

- Dépôt distant : https://github.com/essaireeeee/social-studio (branche `main`). Chaque commit de fin de phase y est poussé : le conteneur cloud de développement est éphémère.
- Le dossier local s'appelle `hexagone-social-studio`, le dépôt GitHub `social-studio`. Les deux désignent le même projet.
