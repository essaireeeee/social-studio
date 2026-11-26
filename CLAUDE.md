# CLAUDE.md : HEXAGONE MMA SOCIAL STUDIO

À relire au début de chaque phase. Cahiers des charges : `PROMPT.md` (V1, terminée) et `PROMPT_V2.md` (V2, en cours). L'avancement est dans `PROGRESS.md` (section « V2 » pour la V2).

## Méthode

- Les phases s'exécutent dans l'ordre. On ne passe pas à la suivante tant qu'un critère de validation échoue.
- Fin de phase : `npm run typecheck`, `npm run lint`, `npm run test` sans erreur, mise à jour de `PROGRESS.md` (fichiers créés, décisions, écarts justifiés), commit `phase-N: <résumé>` (V1) ou `v2-phase-N: <résumé>` (V2).
- V2 : à chaque phase, les 15 scénarios e2e de la V1 (`npm run test:scenarios`) restent verts. Aucune régression V1 n'est acceptée.
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

### Règles ajoutées en V2 (section 1 de `PROMPT_V2.md`)

Toutes les règles ci-dessus restent en vigueur.

**Projet Voltaire**

- Le Projet Voltaire est un service propriétaire de la société Woonoz, sans API publique connue. Aucun appel, aucun scraping, aucune reproduction de ses exercices, de ses contenus pédagogiques, de son logo ou de son interface.
- Le module s'appelle **« Atelier Français »**. Seule mention autorisée, en texte simple dans l'écran « À propos du correcteur » : « Règles organisées par grandes familles, sur le modèle des référentiels d'orthographe professionnelle (type Projet Voltaire). Aucun lien ni partenariat avec le Projet Voltaire. »
- Explications de règles et exemples rédigés pour l'application, avec des phrases du monde du MMA. Exercices jamais repris d'une source externe.

**Interface iOS**

- Inspiration des principes d'interface d'Apple, sans copier les icônes SF Symbols ni embarquer les polices SF. Icônes : `lucide-react`. Police : pile système.
- Matériau translucide flouté autorisé **uniquement** sur la barre de navigation, la tab bar et le fond des sheets. Nulle part ailleurs.

**Calendrier et rappels**

- L'application ne publie rien sur Instagram, Facebook, X ou TikTok. Elle planifie et rappelle ; le CM publie lui-même puis marque le post comme publié.
- Les rappels du navigateur ne fonctionnent que si l'application est ouverte, et l'interface le dit. Le moyen fiable sur téléphone est l'export `.ics` avec alarmes (`VALARM`).
- Dates stockées en ISO 8601 UTC, affichées en Europe/Paris (fuseau configurable).

**Suggestions et campagnes**

- Une suggestion dit toujours pourquoi elle est proposée et d'où vient l'information (lien vers le post, l'événement, la fiche ou l'article source). Le schéma impose au moins une source.
- Une suggestion issue d'un flux d'actualité ne reprend que le titre et le lien. Le CM confirme les faits ; aucun fait d'un article n'entre dans un texte sans validation.
- Un plan de campagne ne crée aucune date, pesée, conférence de presse, face-à-face ou horaire absent de la fiche événement. Une étape qui dépend d'une info manquante est « À confirmer », sans date (le schéma `CalendarItem` refuse une date sur un élément `to_confirm`).
- Aucune statistique de performance inventée : elles n'existent que si le CM les saisit ou les importe.

**Sécurité des nouvelles routes**

- `/api/news/fetch` : URL `http(s)` publiques uniquement ; refuse `localhost`, les IP privées et les redirections vers elles (SSRF). Timeout 8 s, 2 Mo max par flux.
- Les routes IA V2 (`/api/french/check`, `/api/campaign/plan`, `/api/suggestions/ai`) réutilisent les adaptateurs, le prompt système de base, le post-traitement et la bascule native de la V1. Mêmes règles de clés.

## Conventions de code

- TypeScript `strict: true`, aucun `any` non justifié.
- Logique métier dans `/lib`, pure et testable, sans import React.
- Un composant par fichier, 250 lignes maximum, sinon découper.
- Types de domaine dérivés des schémas Zod (`z.infer`).
- Toute chaîne d'interface est en français.
- Aucun `console.log` de payload contenant un en-tête ou un corps de requête IA.

## Repères techniques

- Next.js 16 (App Router, Turbopack, `cacheComponents` actif). Cette version diffère de ce que tu connais : lire le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next (voir `AGENTS.md`).
- Tailwind CSS v4 : les tokens sont définis dans `app/globals.css` (`:root[data-theme="light|dark"]` + `@theme inline`). Pas de `tailwind.config`.
- Design system V2 (section 5 de `PROMPT_V2.md`) : thèmes Jour / Nuit posés par `data-theme` (script d'en-tête + `next-themes`, clé `hex-theme`), indépendants de `data-mode`. Couleurs : `bg-bg`, `bg-surface`, `bg-surface-2`, `text-label`, `text-label-2`, `bg-fill`, `border-separator` (les noms V1 `bg-card`, `text-muted-foreground`… pointent sur ces tokens). **Texte d'accent : `text-accent-text`, `text-live-text`, `text-daily-text`** ; `bg-accent` est un remplissage de bouton (libellé blanc) ; `text-success|warning|danger` sont les variantes lisibles, `bg-*-fill` les aplats. Toute nouvelle paire texte / fond s'ajoute à `contrastPairs()` (`lib/design/contrast.ts`) : le test échoue sous 4,5:1. Typographie : `text-large-title` … `text-caption` (mobile, puis desktop dès 1 024 px), `text-field` pour les champs. Matériau translucide (`bar-material`) : barre de navigation, tab bar, fond des sheets, rien d'autre.
- Composants iOS (`components/ui/`) : `Dialog` (sheet vaul sur mobile, dialogue de 560 px ailleurs), `Sheet` (deux crans), `ActionSheet` (toute confirmation de suppression, via `ConfirmDialog`), `Segmented` (= SegmentedControl), `Switch`, `Stepper`, `Picker` / `TimeField`, `SearchField`, `Chip`, `Skeleton`, `EmptyState`, `Fab`, `GroupedSection` / `Cell`, `FormGroup` / `SwitchRow`, `SwipeActions` (glissement + menu contextuel équivalent), `ContextMenu`, bannières (`toast`). Ne pas recréer une modale ou un menu à la main.
- Shell V2 (`components/layout/`) : `NavigationBar` (titre depuis `screenTitle`, retour depuis `parentOf`), `TabBar` (`TAB_ITEMS`), `Sidebar` iPadOS, écran Plus (`MORE_ITEMS`). Le titre d'une page est un `LargeTitle` (ou `ScreenTitle`) : la barre affiche le petit titre quand il a défilé. Un nouvel écran s'ajoute dans `NAV_SECTIONS`, `MORE_ITEMS` ou `TAB_ITEMS`, avec `available: true` à sa livraison. Une valeur lue dans le navigateur (thème, préférences locales) passe par `useMounted` ou `useSyncExternalStore`, jamais par un `setState` dans un effet.
- PWA : `app/manifest.ts`, icônes `public/icons/`, service worker `public/sw.js` (production seulement, jamais de cache sur `/api/*`). Après un build : `npm run check:pwa`. Captures de revue : `npm run screenshots`.
- Composants de `components/ui` écrits à la main (le registre ui.shadcn.com n'est pas joignable depuis l'environnement de développement). Survol et fonds de contrôle : `bg-fill` (l'ancien `subtle` n'existe plus).
- Tests unitaires : `tests/unit/**/*.test.ts(x)` (Vitest, environnement `node` par défaut, `// @vitest-environment jsdom` pour les composants). E2E : `tests/e2e/*.spec.ts` (Playwright, `@playwright/test` épinglé sur la version du Chromium préinstallé).
- Recette : `tests/e2e/scenarios/` (un fichier par scénario de la section 17.2, étapes communes dans `steps.ts`) et `tests/e2e/annexe-b-termine.spec.ts`. Toute évolution qui touche un parcours du CM doit garder ces scénarios verts (`npm run test:scenarios`). Contrastes : texte ≥ 4,5:1 (le rouge `--danger` ou `--live` ne sert pas de fond à du texte blanc ni de texte sur son propre fond teinté).

- Persistance : toute écriture passe par `DataRepository` (`lib/database/repository.ts`). Pas d'index IndexedDB sur un booléen (non indexable) : filtrer avec `list({ filter })`. Ne jamais importer `*.server.ts` depuis du code client.
- Toute sortie texte (moteur natif, IA, édition CM) passe par `lintText` (`lib/editorial/linter.ts`) avec les règles en base (`loadRules`). Les catégories et leurs champs viennent uniquement de `lib/categories/registry.ts`.
- Style : les moteurs lisent `styleParameters(activeProfile(...), mode)` (`lib/editorial/profile-service.ts`), jamais un profil seulement proposé. Les démos n'entrent dans aucune statistique sauf option explicite.
- Références de style : toujours via `findReferences` / `Retriever` (`lib/retrieval/`), jamais en filtrant la bibliothèque à la main. Le filtre dur (même mode, références réelles) y est garanti.
- Génération depuis l'interface : passer par `generateForBrief` et `refineVariant` (`lib/generation/orchestrator.ts`), qui choisissent le moteur des réglages et basculent sur le natif avec message. Natif seul : `generateNativeForBrief` (`lib/generation/service.ts`). Le contexte (faits, références, CTA, signature) vient toujours de `loadGenerationContext`. Toute nouvelle formulation de modèle respecte les règles de `templates/live.ts` (aucun nombre, nom, date ni diffuseur en dur, pas d'accord de genre) ; le test de propriété de `native-engine.test.ts` doit rester vert.
- Couche IA (`lib/ai/`) : code serveur. Le client n'importe que des types de `lib/ai/*` et passe par `lib/generation/ai-client.ts` (routes locales, clé de session). Journaliser uniquement via `safeLog()` (`lib/ai/keys.ts`), jamais d'en-tête ni de corps. Une sortie IA passe par `processAiText` avant de quitter la route. Après un build : `npm run check:bundle`.
- Retouches : chaque action ajoute une `Revision`, jamais d'écrasement. Une retouche native sans effet lève `RefineUnavailableError` (message affichable) au lieu de créer une révision identique.
- `twitter-text` : import par défaut uniquement (`twitterText.parseTweet`), l'import nommé casse dans les routes Next (ESM).
- Shell (`components/layout/`, `lib/shell/`) : une nouvelle page de l'espace de travail va dans `app/(workspace)/` et rend un `<div>` (le `<main>` est fourni par l'AppShell), avec un `LargeTitle`. Pour l'activer dans la navigation : `available: true` dans `lib/shell/navigation.ts`. Le mode se change via `useMode().setMode` (jamais en écrivant `data-mode` directement). Une action de palette n'est ajoutée que si elle fonctionne (`lib/shell/commands.ts`).
- Studio (`components/studio/`, `lib/studio/`) : le brief en cours est le brouillon du mode (`useStudioStore`, `drafts[mode]`) ; il ne devient un `Brief` que par `toBrief` (champs de la catégorie seulement). Toute action sur une génération passe par `lib/studio/actions.ts` (transitions pures de `revisions.ts`) : jamais de `generations.put` à la main depuis un composant. Les quatre statuts s'affichent via `contentStatus`.
- Aperçu : la coupure des légendes vient de `lib/platforms/truncation.ts` (graphèmes), le bandeau « Simulation éditoriale » est permanent (`SIMULATION_NOTICE`).
- Bibliothèque (`components/library/`, `lib/library/`) : la liste passe par `queryLibrary` (index BM25 construit une fois par liste avec `createLibraryIndex`), jamais par un filtre écrit dans un composant. Écritures : `saveWording`, `toggleReference`, `deleteWording` (`lib/library/actions.ts`) ; doublon contrôlé avec `checkDuplicate` avant tout enregistrement. Les listes longues sont virtualisées (`useWindowVirtual`, lignes de hauteur fixe).
- Imports (`lib/import/`) : toute source (collage, CSV, Excel, export Instagram) produit des `ImportRecord`, puis passe par `ImportReviewFlow` (étapes Vérifier et Confirmer) et `commitImport`. `summarize` et `willImport` décrivent exactement ce que `commitImport` écrira. Aucun appel réseau vers Instagram.
- Fiches (`lib/fighters/`, `lib/events/`, `lib/hashtags/`, écrans `components/{fighters,events,hashtags}/`) : formulaires en valeurs texte (`fighterForm`, `eventForm`, `groupForm`, `signatureForm`), validés par `*FormErrors`, convertis par `*FromForm` (schéma Zod, `updatedAt` mis à jour) et écrits par `lib/*/actions.ts`. Le palmarès est toujours daté (`asOf`). La fight card s'édite avec les fonctions pures de `lib/events/fight-card.ts` (un combattant dans un seul combat). Le rendu des signatures reste `renderSignature` / `signatureValues` (`lib/generation/signature.ts`). Une date « mise à jour » s'affiche avec `UpdatedNote` (badge « À vérifier » au-delà de 90 jours).
- Brief du Studio : un champ marqué `fromEvent` est rempli depuis la fiche de l'événement choisi (`setEventField`, `eventPrefill` dans `lib/studio/draft.ts`), sans jamais écraser une saisie du CM. Le palmarès n'entre dans les faits que si `useRecord` est coché, avec une formulation datée.
- Données (`lib/data/`, `components/settings/data/`) : exports via `snapshotJson`, `libraryCsv` (BOM UTF-8, colonnes de l'import) et `snapshotWorkbook` ; un import JSON passe par `readSnapshotText` (champs interdits refusés, migration) puis `importAll`. Tout remplacement fournit `backupBeforeReplace` (copie dans `data/backups/`, sinon téléchargement). Réinitialisation : `resetApplication`, jamais un vidage de tables à la main.
- Historique (`lib/history/`) : les quatre statuts s'affichent avec `GenerationStatusBadge` (libellés `GENERATION_STATUS_LABELS`), le texte final avec `finalTextOf`. Rien n'entre dans le corpus de style sans action du CM (`pendingReferences`, « Ajouter comme référence »).
- Notifications : `toast(message, tone, action?)` ; une erreur réessayable passe `{ label: "Réessayer", onClick }`.
- Jamais `new Date()` ni `Date.now()` pendant le rendu d'un composant client (Cache Components) : `useNow()` ou un gestionnaire d'événement.
- Composants client qui lisent la base : `useRepository()` (null tant que les données ne sont pas prêtes) + `useLiveQuery`.
- Schéma de base v2 (`lib/database/db.ts`, `DEXIE_SCHEMA_V2`) : les tables V1 sont reprises à l'identique, dix tables s'ajoutent (types dans `types/v2.ts`). Toute nouvelle table : schéma Zod dans `types/v2.ts`, index dans `db.ts` (nouvelle `db.version(N)` si les index changent), entrée dans `TABLE_NAMES` et `SnapshotTablesSchema`, store dans `DexieRepository`, libellés dans `SHEET_NAMES` et `TABLE_LABELS`, entité dans `sampleEntities`. Un changement de format d'instantané incrémente `CURRENT_SCHEMA_VERSION` et ajoute `MIGRATIONS[n]`. `tests/fixtures/snapshot-v1.json` est un vrai export V1 : ne pas le régénérer.
- Brief partiel (calendrier, campagnes, suggestions) : `BriefDraftSchema`, sans valeurs par défaut. Il ne devient un `Brief` qu'en passant par le Studio.
- Les outils d'écriture de fichiers transforment les séquences `\u…` en caractères bruts. Pour un caractère invisible dans le code : `new RegExp("\\u…")` ou `String.fromCodePoint(…)`.

@AGENTS.md
