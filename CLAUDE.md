# CLAUDE.md : HEXAGONE MMA SOCIAL STUDIO

À relire au début de chaque phase. Le cahier des charges complet est dans `PROMPT.md`, l'avancement dans `PROGRESS.md`.

## Méthode

- Les phases s'exécutent dans l'ordre. On ne passe pas à la suivante tant qu'un critère de validation échoue.
- Fin de phase : `npm run typecheck`, `npm run lint`, `npm run test` sans erreur, mise à jour de `PROGRESS.md` (fichiers créés, décisions, écarts justifiés), commit `phase-N: <résumé>`.
- Instruction impossible ou ambiguë : option la plus simple qui fonctionne réellement, documentée dans `PROGRESS.md`.
- Aucun bouton, écran ou fonction décoratif. Une fonctionnalité non implémentée n'apparaît pas, ou apparaît désactivée avec la mention « Bientôt disponible ».

## Règles non négociables

### Vérité des données

- Aucun moteur (natif ou IA) n'invente un résultat, un palmarès, une statistique, une date, un horaire, un diffuseur, un prix, une citation ou une information biographique.
- Une information absente du brief, de la session live ou des fiches combattant/événement n'apparaît pas dans le texte. Le segment qui en dépend est supprimé, pas complété.
- Toute fiche combattant ou événement affiche sa date de dernière mise à jour. Au-delà de 90 jours : badge « À vérifier ».

### Honnêteté du produit

- Le moteur natif est un moteur de composition à partir de modèles et de références. Il n'est jamais présenté comme une IA.
- L'aperçu réseaux sociaux affiche en permanence : « Simulation éditoriale : le rendu réel varie selon l'appareil et l'application ».
- Les six exemples de démonstration portent le badge « EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE » et sont exclus par défaut des statistiques, de l'ADN éditorial et de la recherche de références.
- Aucune connexion API simulée. Le test de connexion fait un vrai appel.
- Aucun scraping Instagram. Aucun contournement des restrictions de Meta.

### Séparation des univers

- LIVE SHOW et DAILY & MEDIA ont chacun leurs catégories, modèles, références et profil de style.
- Les références d'un mode ne servent jamais à générer dans l'autre.
- Changer de mode conserve les champs communs (combattants, événement), jamais les références.

### Statuts des contenus

Quatre états distincts, jamais confondus dans l'interface ni dans les données :

- `generated` : sortie brute d'un moteur.
- `edited` : texte modifié par le CM.
- `validated` : texte validé par le CM.
- `published` : texte que le CM déclare publié (action manuelle explicite).

Une génération ne devient une référence de style qu'après validation par le CM. Modifier l'ADN éditorial ou les règles exige le rôle administrateur.

### Sécurité des clés API

- Aucune clé en dur, ni dans le bundle client, ni dans IndexedDB, localStorage, le fichier de sauvegarde JSON ou les logs.
- Les appels aux modèles passent exclusivement par les routes serveur Next.js.
- Priorité 1 : `.env.local` côté serveur. Priorité 2 : clé saisie dans l'interface, gardée uniquement dans `sessionStorage`, transmise à la route locale par l'en-tête `x-hex-provider-key`, jamais persistée côté serveur.
- Saisie de clé dans l'interface désactivée si `NODE_ENV=production`, sauf `ALLOW_CLIENT_KEYS=true`.
- Le moteur natif reste disponible si le fournisseur IA échoue (bascule automatique, message clair).

### Règles éditoriales HEXAGONE MMA

- « de HEXAGONE MMA », jamais « d'HEXAGONE MMA ».
- Exceptions : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA ».
- **Samba Sima**, en contexte positif (victoire, présentation, annonce, champion) : présenté comme un crack, un jeune phénomène exceptionnel. Jamais en contexte de défaite.
- Pas d'accroches répétitives, pas de hashtags systématiques, pas de surcharge d'emojis, pas de ton publicitaire sur chaque post, pas de formules typiques d'IA.
- Les références ne sont jamais recopiées textuellement.

## Conventions de code

- TypeScript `strict: true`, aucun `any` non justifié.
- Logique métier dans `/lib`, pure et testable, sans import React.
- Un composant par fichier, 250 lignes maximum, sinon découper.
- Types de domaine dérivés des schémas Zod (`z.infer`).
- Toute chaîne d'interface est en français.
- Aucun `console.log` de payload contenant un en-tête ou un corps de requête IA.

## Repères techniques

- Next.js 16 (App Router, Turbopack, `cacheComponents` actif). Cette version diffère de ce que tu connais : lire le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next (voir `AGENTS.md`).
- Tailwind CSS v4 : les tokens sont définis dans `app/globals.css` (`:root` + `@theme inline`). Pas de `tailwind.config`.
- Composants shadcn/ui copiés à la main dans `components/ui` (le registre ui.shadcn.com n'est pas joignable depuis l'environnement de développement). Dans ces composants, `accent` / `primary` désignent la couleur du mode actif ; les surfaces de survol utilisent `subtle`.
- Tests unitaires : `tests/unit/**/*.test.ts(x)` (Vitest, environnement `node` par défaut, `// @vitest-environment jsdom` pour les composants). E2E : `tests/e2e/*.spec.ts` (Playwright, `@playwright/test` épinglé sur la version du Chromium préinstallé).

- Persistance : toute écriture passe par `DataRepository` (`lib/database/repository.ts`). Pas d'index IndexedDB sur un booléen (non indexable) : filtrer avec `list({ filter })`. Ne jamais importer `*.server.ts` depuis du code client.
- Toute sortie texte (moteur natif, IA, édition CM) passe par `lintText` (`lib/editorial/linter.ts`) avec les règles en base (`loadRules`). Les catégories et leurs champs viennent uniquement de `lib/categories/registry.ts`.
- Style : les moteurs lisent `styleParameters(activeProfile(...), mode)` (`lib/editorial/profile-service.ts`), jamais un profil seulement proposé. Les démos n'entrent dans aucune statistique sauf option explicite.
- Composants client qui lisent la base : `useRepository()` (null tant que les données ne sont pas prêtes) + `useLiveQuery`.
- Les outils d'écriture de fichiers transforment les séquences `\u…` en caractères bruts. Pour un caractère invisible dans le code : `new RegExp("\\u…")` ou `String.fromCodePoint(…)`.

@AGENTS.md
