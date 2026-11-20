# HEXAGONE MMA SOCIAL STUDIO
## Prompt d'architecture et de développement pour Claude Code

> **Mode d'emploi (pour l'humain)**
> 1. Crée un dossier vide, place ce fichier à la racine sous le nom `PROMPT.md`.
> 2. Lance `claude` dans ce dossier.
> 3. Première consigne : `Lis PROMPT.md en entier, puis exécute la Phase 0. Ne passe à la phase suivante que lorsque tous les critères de validation de la phase en cours sont remplis.`
> 4. Pour enchaîner : `Phase suivante.` Pour reprendre après une coupure : `Lis PROGRESS.md et reprends là où tu t'es arrêté.`

---

## 0. RÔLE, MISSION ET MÉTHODE DE TRAVAIL

Tu es à la fois Product Designer senior et développeur full-stack expert en React, TypeScript, Next.js, Tailwind CSS et intégration de modèles de langage.

Tu construis **HEXAGONE MMA SOCIAL STUDIO** (baseline : « Your voice. Your fight. Your content. »), un outil interne de production éditoriale pour les Community Managers de HEXAGONE MMA, ligue française de MMA.

L'outil permet de rédiger en quelques secondes des publications Instagram, Facebook, X et TikTok, en s'appuyant sur une mémoire éditoriale : les anciens posts réellement publiés, enregistrés par le CM.

Ce n'est pas un générateur de texte générique. C'est un outil de travail qui doit fonctionner dès le premier lancement, sans clé API, et devenir meilleur à mesure que la bibliothèque grandit.

### Méthode imposée

- Exécute les phases **dans l'ordre**. Chaque phase se termine par une liste de critères de validation. Tu ne passes pas à la suite tant qu'un critère échoue.
- À la fin de chaque phase :
  1. `npm run typecheck`, `npm run lint`, `npm run test` doivent passer sans erreur.
  2. Mets à jour `PROGRESS.md` : phase terminée, fichiers créés, décisions prises, écarts éventuels par rapport à ce prompt et leur justification.
  3. Fais un commit git : `phase-N: <résumé>`.
- Dès la Phase 0, crée un fichier `CLAUDE.md` à la racine qui reprend les **règles non négociables** (section 1) et les conventions de code (section 3.4). Relis-le au début de chaque phase.
- Si une instruction de ce prompt est techniquement impossible ou ambiguë, choisis l'option la plus simple qui fonctionne réellement, documente-la dans `PROGRESS.md` et continue.
- Ne crée **jamais** de bouton, d'écran ou de fonction décorative. Une fonctionnalité non implémentée n'apparaît pas dans l'interface, ou apparaît désactivée avec la mention « Bientôt disponible ».

---

## 1. RÈGLES NON NÉGOCIABLES

### 1.1 Vérité des données
- Aucun moteur (natif ou IA) n'invente un résultat, un palmarès, une statistique, une date, un horaire, un diffuseur, un prix, une citation ou une information biographique.
- Une information absente du brief, de la session live ou des fiches combattant/événement **n'apparaît pas** dans le texte. Le segment qui en dépend est supprimé, pas complété.
- Toute fiche combattant ou événement affiche sa date de dernière mise à jour. Une donnée de plus de 90 jours porte un badge « À vérifier ».

### 1.2 Honnêteté du produit
- Le moteur natif est présenté comme un **moteur de composition à partir de modèles et de références**, jamais comme une IA.
- L'aperçu réseaux sociaux porte en permanence la mention « Simulation éditoriale : le rendu réel varie selon l'appareil et l'application ».
- Les six exemples de démonstration portent le badge « EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE » et sont exclus par défaut des statistiques, de l'ADN éditorial et de la recherche de références.
- Aucune connexion API simulée. Le test de connexion fait un vrai appel.
- Aucun scraping Instagram. Aucun contournement des restrictions de Meta.

### 1.3 Séparation des univers
- LIVE SHOW et DAILY & MEDIA ont chacun leurs catégories, modèles, références et profil de style.
- Les références d'un mode ne sont **jamais** utilisées pour générer dans l'autre mode.
- Changer de mode conserve les champs communs déjà saisis (combattants, événement), jamais les références.

### 1.4 Statuts des contenus
Quatre états distincts, jamais confondus dans l'interface ni dans les données :
- `generated` : sortie brute d'un moteur.
- `edited` : texte modifié par le CM.
- `validated` : texte validé par le CM.
- `published` : texte que le CM déclare publié (action manuelle explicite).

Une génération ne devient une référence de style qu'après validation par le CM. Une modification de l'ADN éditorial ou des règles nécessite le rôle administrateur.

### 1.5 Sécurité des clés API
- Aucune clé en dur dans le code, aucune clé dans le bundle client, aucune clé dans IndexedDB, localStorage, le fichier de sauvegarde JSON ou les logs.
- Les appels aux modèles passent exclusivement par les routes serveur Next.js.
- Priorité 1 : clés dans `.env.local` côté serveur. Priorité 2 : clé saisie dans l'interface, conservée uniquement dans `sessionStorage`, transmise à la route locale par un en-tête, jamais persistée côté serveur.
- La saisie de clé dans l'interface est désactivée si `NODE_ENV=production`, sauf si `ALLOW_CLIENT_KEYS=true`.
- Le moteur natif reste disponible si le fournisseur IA échoue (bascule automatique avec message clair).

### 1.6 Règles éditoriales HEXAGONE MMA (implémentées dans un linter, section Phase 2)
- On écrit « de HEXAGONE MMA », jamais « d'HEXAGONE MMA ».
- Exception : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA ».
- Lorsque le wording concerne **Samba Sima** dans un contexte positif (victoire, présentation, annonce, champion), il est présenté comme un crack, un jeune phénomène exceptionnel. Jamais dans un contexte de défaite.
- Pas d'accroches répétitives, pas de hashtags systématiques, pas de surcharge d'emojis, pas de ton publicitaire sur chaque post, pas de formules typiques d'IA.
- Les références ne sont jamais recopiées textuellement.

---

## 2. CONTEXTE UTILISATEUR

Le CM travaille dans deux situations très différentes.

**Soir de gala (LIVE SHOW).** Il est en régie, en tribune ou au bord de la cage, souvent sur téléphone, avec une main libre et peu de temps. Objectif : un post de victoire en **moins de 30 secondes**. Parcours cible :
`LIVE SHOW → KO / TKO → Combattant → Adversaire → Round → Générer` : 6 interactions maximum, aucune saisie de contexte événement (fournie par la Session Live).

**Au bureau (DAILY & MEDIA).** Il prépare des annonces de combat, des relais presse, des passages TV, de la billetterie. Il a le temps, il veut de la précision et du storytelling.

---

## 3. STACK ET DÉCISIONS TECHNIQUES

### 3.1 Stack retenue

| Besoin | Choix | Raison |
|---|---|---|
| Framework | **Next.js (App Router) + React + TypeScript strict** | Routes serveur natives pour protéger les clés API et écrire le fichier de sauvegarde local. Un seul projet, un seul `npm run dev`. |
| Style | **Tailwind CSS** (version stable courante) + variables CSS pour les tokens | Design system piloté par tokens, changement d'accent par mode sans re-render lourd. |
| Composants accessibles | **Radix UI** (via shadcn/ui, composants copiés dans le repo) | Dialog, Tabs, Popover, Toggle Group, Tooltip accessibles au clavier. |
| Icônes | **lucide-react** | Demandé. |
| État UI | **Zustand** | Léger, pas de boilerplate, persistance sélective. |
| Base locale | **IndexedDB via Dexie** + `dexie-react-hooks` (`useLiveQuery`) | Des milliers de wordings, requêtes indexées, synchro multi-onglets. |
| Préférences légères | **localStorage** | Thème, colonne réduite, dernier mode. |
| Fichier local | **Route `/api/storage`** qui écrit `./data/hexagone-studio.json` | Sauvegarde automatique sur disque, lisible, versionnable hors git. |
| Validation | **Zod** | Schémas partagés client/serveur, validation des imports et des sorties IA. |
| CSV | **papaparse** | Fiable, gère les guillemets et retours ligne. |
| Excel | **exceljs** | Lecture et écriture `.xlsx` sans dépendance réseau. |
| Comptage X | **twitter-text** | Comptage pondéré officiel (emojis, URL). |
| IA | **@anthropic-ai/sdk**, **openai** | Adaptateurs séparés derrière une interface commune. |
| Diff | **diff** (jsdiff) | Historique des corrections CM. |
| Tests | **Vitest** + Testing Library, **Playwright** | Unitaires sur les moteurs, e2e sur les 15 scénarios. |
| Qualité | ESLint, Prettier, `tsc --noEmit` | Scripts `lint`, `typecheck`, `format`. |

Polices : **Geist Sans** et **Geist Mono** via `next/font` (fallback Inter).

### 3.2 Persistance : architecture à trois niveaux

1. **IndexedDB (source de vérité dans le navigateur).** Toutes les écritures passent par un `DataRepository` (interface TypeScript). Implémentation v1 : `DexieRepository`.
2. **Fichier JSON local (sauvegarde automatique sur disque).**
   - Après chaque écriture, un service `FileSyncService` envoie un instantané complet (debounce 2 s) à `POST /api/storage/snapshot`.
   - La route écrit de manière atomique : fichier temporaire puis `rename` vers `data/hexagone-studio.json`.
   - Rotation : conserve les 10 derniers instantanés horodatés dans `data/backups/`.
   - Au démarrage, si IndexedDB est vide et que le fichier existe : modale « Une sauvegarde locale du JJ/MM/AAAA HH:MM a été trouvée (N wordings). Restaurer ? ».
   - Activé par `FILE_SYNC_ENABLED=true` (défaut en local). Si la route renvoie une erreur ou si l'environnement est en lecture seule, la synchro se désactive proprement et un indicateur l'affiche dans le header.
   - `data/` est dans `.gitignore`.
   - Le fichier ne contient **jamais** de clé API.
3. **Export / import manuel** : JSON intégral, CSV, Excel (Phase 11).

**Évolution Supabase.** Le `DataRepository` permet d'ajouter plus tard un `SupabaseRepository` (synchro multi-postes, utilisateurs, pgvector). En v1 : l'interface, un fichier `lib/database/supabase.README.md` qui décrit le mapping des tables, et rien d'autre. Pas d'implémentation factice.

### 3.3 Arborescence

```
/app
  /(workspace)
    /dashboard/page.tsx
    /studio/page.tsx              # ?mode=live|daily
    /library/page.tsx
    /fighters/page.tsx
    /events/page.tsx
    /hashtags/page.tsx            # hashtags & signatures
    /editorial/page.tsx           # ADN éditorial + règles
    /history/page.tsx
    /validated/page.tsx
    /settings/[section]/page.tsx  # ai | preferences | data | users
    layout.tsx                    # AppShell
  /api
    /generate/route.ts
    /refine/route.ts
    /decline/route.ts             # déclinaison multi-réseaux
    /ai/test/route.ts
    /storage/snapshot/route.ts
    /storage/restore/route.ts
  layout.tsx
  globals.css

/components
  /layout        AppShell, Sidebar, Header, ModeSwitcher, LiveSessionBar, CommandSearch
  /studio        StudioLayout, BriefColumn, WordingColumn, PreviewColumn, MobileStudioTabs
  /forms         CategoryPills, DynamicForm, fields/*, QuickChips, FighterCombobox, HashtagPicker, SignaturePicker
  /editor        VariantCard, VariantEditor, RefineBar, RevisionTimeline, ReferencesPanel, FactGuardWarnings
  /preview       PlatformSwitcher, InstagramPreview, FacebookPreview, XPreview, TikTokPreview, CaptionTruncator
  /library       WordingList, WordingGrid, WordingForm, BulkImportModal, InstagramImportModal, CsvImportModal
  /editorial     StyleProfileView, RuleEditor, StatBar
  /ui            Button, Pill, Badge, Toast, Skeleton, Dialog, Tabs, Kbd, EmptyState...

/lib
  /database      db.ts (Dexie), repository.ts (interface), dexie-repository.ts, file-sync.ts, seed.ts, migrations.ts
  /editorial     rules.ts, linter.ts, style-extractor.ts, text-utils.ts, stopwords-fr.ts, emoji.ts
  /retrieval     scorer.ts, tokenizer.ts, index.ts
  /generation    native/engine.ts, native/templates/*.ts, native/hooks.ts, native/composer.ts
                 fact-guard.ts, anti-copy.ts, post-process.ts, variants.ts
  /ai            types.ts, adapters/anthropic.ts, adapters/openai.ts, registry.ts, prompts.ts, schema.ts
  /platforms     rules.ts, counters.ts, truncation.ts
  /categories    registry.ts (catalogue des catégories et des champs)
  /import        splitter.ts, classifier.ts, dedupe.ts, instagram-export.ts, csv.ts, excel.ts
  /export        json.ts, csv.ts, excel.ts
/types           domain.ts (types partagés, dérivés des schémas Zod)
/hooks           useShortcuts, useAutosave, useMode, useLiveSession, useClipboard
/stores          studio.store.ts, ui.store.ts
/tests           unit/*, e2e/*
/data            (ignoré par git)
```

### 3.4 Conventions de code
- TypeScript `strict: true`, aucun `any` non justifié.
- Logique métier dans `/lib`, **pure et testable**, sans import React.
- Composants : un composant par fichier, 250 lignes maximum, sinon découper.
- Les types de domaine sont dérivés des schémas Zod (`z.infer`).
- Toute chaîne d'interface est en français.
- Aucun `console.log` de payload contenant un en-tête ou un corps de requête IA.

---

## 4. DESIGN SYSTEM « OCTOGON DARK »

### 4.1 Tokens (dans `globals.css`, exposés à Tailwind)

```
--bg:            #0A0B0E
--bg-elevated:   #101319
--card:          #13161C
--border:        #222630
--text:          #F3F4F6
--text-muted:    #9CA3AF
--live:          #E11D48
--daily:         #D97706
--accent:        var(--live)     /* basculé par [data-mode] */
--success:       #10B981
--warning:       #F59E0B
--danger:        #EF4444
--radius-sm: 6px  --radius-md: 8px  --radius-lg: 12px
```

`<html data-mode="live">` ou `data-mode="daily"` redéfinit `--accent`. Tout composant d'action principale utilise `--accent`. Transition de couleur 150 ms, rien de plus.

### 4.2 Échelle
- Texte : 12 / 13 / 14 (corps) / 16 / 20 / 24. Interligne 1,5 pour l'éditeur.
- Espacements : base 4 px. Densité « outil pro » : padding de carte 12 à 16 px.
- Hauteur des contrôles : 32 px (desktop), 44 px minimum en mode tactile (LIVE SHOW sur mobile).

### 4.3 Principes
- Inspirations : Linear, Notion, Stripe Dashboard, régies de production sportive. Ne copie aucune interface.
- Interdits : dégradés appuyés, glassmorphism, grandes cartes vides, plus de deux couleurs d'accent à l'écran, animations décoratives.
- États obligatoires sur tout élément interactif : `hover`, `focus-visible` (anneau `--accent`), `active`, `disabled`, `loading`.
- Contraste AA minimum.

### 4.4 Signatures visuelles des modes
- **LIVE SHOW** : pastille « ON AIR » rouge avec pulsation lente (2 s, opacité 60 à 100 %), désactivée si `prefers-reduced-motion`. Typographie des pills en majuscules, plus grosse. Ambiance régie.
- **DAILY & MEDIA** : accent or, mise en page plus aérée, champs éditoriaux plus longs.

---

## 5. PHASE 0 : SETUP DU PROJET

**Tâches**
1. Initialise Next.js (App Router, TypeScript, ESLint, Tailwind, `src/` non utilisé, alias `@/*`).
2. Installe les dépendances de la section 3.1.
3. Configure shadcn/ui avec les tokens de la section 4 (pas les couleurs par défaut).
4. Crée l'arborescence de la section 3.3 avec des fichiers `index.ts` vides là où c'est utile.
5. Scripts `package.json` : `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:e2e`.
6. Crée `.env.example` :
   ```
   # Fournisseur IA par défaut : native | anthropic | openai
   AI_PROVIDER=native
   ANTHROPIC_API_KEY=
   ANTHROPIC_MODEL=claude-sonnet-5-5
   OPENAI_API_KEY=
   OPENAI_MODEL=
   AI_TIMEOUT_MS=30000
   FILE_SYNC_ENABLED=true
   ALLOW_CLIENT_KEYS=false
   ```
   Le nom de modèle est toujours lu depuis l'environnement. Si `OPENAI_MODEL` est vide, l'adaptateur OpenAI se déclare « non configuré ».
7. `.gitignore` : `.env*.local`, `/data`, `/playwright-report`, `/test-results`.
8. Crée `CLAUDE.md` (règles section 1 + conventions 3.4) et `PROGRESS.md`.
9. Initialise git.

**Critères de validation**
- `npm run dev` affiche une page vide aux couleurs du thème.
- `typecheck`, `lint`, `test` (un test factice) passent.

---

## 6. PHASE 1 : SCHÉMA DE DONNÉES, PERSISTANCE ET EXEMPLES

### 6.1 Types de domaine (schémas Zod dans `/types/domain.ts`)

```ts
type Mode = 'live' | 'daily';
type Platform = 'instagram' | 'facebook' | 'x' | 'tiktok';
type ContentStatus = 'generated' | 'edited' | 'validated' | 'published';
type Source = 'manual' | 'bulk' | 'csv' | 'excel' | 'instagram_export' | 'studio' | 'demo';

interface Wording {               // une publication de la bibliothèque
  id: string;                     // uuid
  text: string;
  textNormalized: string;         // minuscules, sans accents, sans emojis, espaces compactés
  contentHash: string;            // sha-256 de textNormalized (doublons exacts)
  mode: Mode;
  categoryId: string;             // voir registre des catégories
  platform: Platform;
  fighterIds: string[];
  eventId?: string;
  date?: string;                  // ISO, date de publication
  instagramUrl?: string;          // stockée, jamais récupérée automatiquement
  hashtags: string[];             // extraits automatiquement + édition
  emojis: string[];               // extraits automatiquement
  cta?: string;
  tags: string[];
  internalNotes?: string;
  status: 'validated' | 'published';   // la bibliothèque ne contient que du validé ou du publié
  source: Source;
  isDemo: boolean;
  isReference: boolean;           // utilisable comme référence de style (défaut true sauf démo)
  createdAt: string; updatedAt: string;
}

interface Fighter {
  id: string; firstName: string; lastName: string; nickname?: string;
  nationality?: string; weightClass?: string; club?: string;
  record?: { wins: number; losses: number; draws: number; nc?: number; asOf: string };
  bio?: string; fightHistory: { date: string; opponent: string; result: 'W'|'L'|'D'|'NC'; method?: string; eventId?: string }[];
  editorialNotes?: string;        // ex. règle Samba Sima
  internalNotes?: string;
  updatedAt: string;
}

interface HexEvent {
  id: string; name: string; number?: number; date?: string;
  city?: string; venue?: string; address?: string;
  ticketingUrl?: string; links: { label: string; url: string }[];
  broadcasters: { name: string; channel?: string; startTime?: string; scope?: 'prelims'|'main_card'|'full' }[];
  confirmedSchedule: boolean;     // false : aucun horaire n'est injecté dans les textes
  fightCard: { fighterAId: string; fighterBId: string; weightClass?: string; position: 'main'|'co-main'|'card'|'prelim'; title?: boolean }[];
  notes?: string; updatedAt: string;
}

interface LiveSession {
  id: string; eventId?: string;
  eventName: string; eventNumber?: number; venue?: string; city?: string; date?: string;
  broadcast?: string; ticketing?: string;
  startedAt: string; endedAt?: string; active: boolean;
}

interface Brief {                 // ce que le CM a saisi
  mode: Mode; categoryId: string; platform: Platform;
  fields: Record<string, string | number | boolean | undefined>;
  hashtagIds: string[]; signatureId?: string; cta?: string;
  liveSessionId?: string; freeInstruction?: string;
}

interface Variant {
  id: string; kind: 'punchy' | 'signature' | 'storytelling';
  revisions: Revision[];          // la dernière est la courante
  selected: boolean;
}
interface Revision {
  id: string; text: string; createdAt: string;
  origin: 'native' | 'anthropic' | 'openai' | 'cm_edit';
  action?: RefineAction; instruction?: string;
  factWarnings: FactWarning[];
}

interface Generation {
  id: string; createdAt: string; updatedAt: string;
  brief: Brief; engine: 'native' | 'anthropic' | 'openai'; fallbackReason?: string;
  referenceIds: string[];         // références réellement utilisées
  variants: Variant[];
  finalText?: string; finalPlatform?: Platform;
  status: 'draft' | 'editing' | 'validated' | 'published';
  savedToLibraryId?: string;
  declinations?: Partial<Record<Platform, string>>;
}

interface HashtagGroup { id: string; name: string; kind: 'official'|'mma_france'|'event'|'fighter'|'campaign'; tags: string[]; defaultOn: boolean; modes: Mode[]; }
interface Signature { id: string; name: string; template: string; requiredFields: string[]; modes: Mode[]; enabled: boolean; }
interface EditorialRule { id: string; label: string; kind: 'replace'|'forbid'|'require'|'contextual'; pattern?: string; replacement?: string; enabled: boolean; editableBy: 'admin'; }
interface StyleProfile { /* section 8.3 */ }
interface UserProfile { id: string; name: string; role: 'cm' | 'admin'; }
interface Settings { quickOptions: { rounds: string[]; methods: string[]; broadcasters: string[] }; igTruncation: number; activeUserId: string; aiProvider: 'native'|'anthropic'|'openai'; /* ... */ }
```

### 6.2 Dexie (`lib/database/db.ts`)

```ts
db.version(1).stores({
  wordings:     'id, mode, categoryId, platform, eventId, date, contentHash, isDemo, isReference, status, *fighterIds, *tags, *hashtags, updatedAt',
  fighters:     'id, lastName, nickname, weightClass, updatedAt',
  events:       'id, date, name, updatedAt',
  liveSessions: 'id, active, startedAt',
  generations:  'id, createdAt, status, [brief.mode+createdAt]',
  hashtagGroups:'id, kind',
  signatures:   'id',
  rules:        'id, enabled',
  styleProfiles:'id, mode, createdAt, status',
  users:        'id',
  blobs:        'id',             // images de prévisualisation, logo
  meta:         'key'             // schemaVersion, lastBackupAt, seedVersion
});
```

Prévois `migrations.ts` avec un numéro de version de schéma inclus dans chaque export JSON.

### 6.3 Repository
Interface `DataRepository` avec méthodes typées par entité (`list`, `get`, `put`, `bulkPut`, `delete`, `search`), plus `exportAll()` et `importAll(snapshot, strategy: 'merge'|'replace')`. Toute suppression passe par une confirmation côté UI. `replace` exige une double confirmation et crée d'abord une sauvegarde.

### 6.4 Données initiales (`seed.ts`, exécuté une seule fois, `seedVersion` dans `meta`)
- **Six wordings de démonstration** (3 LIVE SHOW, 3 DAILY & MEDIA), `isDemo: true`, `isReference: false`, `source: 'demo'`. Combattants **fictifs** aux noms clairement inventés. Ils illustrent des structures différentes : résultat KO court, nouveau champion, réaction combattant ; annonce de combat, relais média, billetterie.
- **Hashtags** : groupe officiel `#HexagoneMMA`, groupe MMA France `#MMAFrance #MMA #CombatSports`. Aucun activé par défaut sauf `#HexagoneMMA`.
- **Signatures** :
  - « Signature événementielle » :
    ```
    🗓️ {date} - {venue}, {city}
    📺 En direct sur {broadcaster}
    🎫 Prenez vos places dès maintenant !
    (Lien en bio du profil)
    ```
    `requiredFields: ['date','venue','city']`. La ligne 📺 n'est rendue que si `broadcaster` est renseigné.
  - « Diffusion détaillée » :
    ```
    📺 En direct à partir de {prelimsTime} sur {prelimsChannel} et à partir de {mainTime} pour la carte principale sur {mainChannel}
    ```
    Rendue uniquement si l'événement a `confirmedSchedule: true` et les quatre champs renseignés.
- **Règles éditoriales** de la section 1.6.
- **Fiche combattant Samba Sima** : nom uniquement, `editorialNotes` avec la règle, aucune autre donnée inventée (palmarès, club, etc. laissés vides).
- **Utilisateur par défaut** : « Community Manager », rôle `admin` (modifiable).
- **Options rapides** : rounds `R1..R5`, méthodes `KO, TKO, Soumission, Décision`, diffusion `RMC SPORT, DAZN, YouTube, Autre, Aucun`.

### 6.5 Synchro fichier
Implémente `FileSyncService` et les routes `/api/storage/snapshot` (POST, écriture atomique, rotation) et `/api/storage/restore` (GET, lecture du dernier instantané). Valide le corps avec Zod. Taille maximale configurable (50 Mo par défaut).

**Critères de validation**
- Tests unitaires : `put/get/delete` sur chaque entité, export puis import JSON identique (round-trip), migration v1 vide.
- Test : un instantané envoyé à la route crée bien `data/hexagone-studio.json` et un fichier dans `data/backups/`, sans aucun champ nommé `apiKey`, `key`, `token`.
- Après actualisation du navigateur, les données sont toujours là.

---

## 7. PHASE 2 : CATALOGUE DES CATÉGORIES, RÈGLES ÉDITORIALES ET LINTER

### 7.1 Registre des champs (`lib/categories/registry.ts`)

Chaque champ est défini une seule fois :

```ts
interface FieldDef {
  key: string; label: string;
  type: 'fighter' | 'text' | 'textarea' | 'chips' | 'time' | 'date' | 'url' | 'event' | 'select' | 'toggle';
  options?: string[] | 'settings.rounds' | 'settings.methods' | 'settings.broadcasters';
  placeholder?: string;
  fromSession?: keyof LiveSession;   // pré-rempli par la Session Live
  fromEvent?: keyof HexEvent;        // pré-rempli par la fiche événement
  showIf?: { field: string; equals: string | string[] };
}
interface CategoryDef {
  id: string; mode: Mode; group?: 'sport'|'event'|'media'|'communication';
  label: string; emoji: string; shortcut?: string;   // touche 1..9, 0, -, = en LIVE
  required: string[]; optional: string[];
  presets?: Record<string, string>;                  // ex. KO/TKO pré-sélectionne method
  defaultSignatureId?: string; tone: string;         // consigne de ton transmise aux moteurs
}
```

Les champs requis sont visibles d'emblée. Les optionnels sont repliés sous « Plus de détails » (sauf ceux marqués `promote: true`). Les champs pré-remplis par la session ou l'événement sont affichés en lecture seule avec un bouton « Modifier pour ce post ».

### 7.2 Catégories LIVE SHOW

| id | Libellé | Requis | Optionnels | Presets / remarques |
|---|---|---|---|---|
| `live_result` | 🏆 Résultat combat | fighter1, fighter2, winner, method | round, time, decisionType*, highlight | *`decisionType` visible seulement si method = Décision |
| `live_ko` | 💥 KO / TKO | winner, loser | method (KO/TKO), round, time, highlight | method pré-réglé sur KO, bascule TKO en 1 clic |
| `live_sub` | 🐍 Soumission | winner, loser | submissionType, round, time, highlight | chips submissionType : Étranglement arrière, Guillotine, Clé de bras, Triangle, Kimura, Autre (texte) |
| `live_decision` | ⚖️ Décision | winner, loser, decisionType | scores, highlight | decisionType : Unanime / Partagée / Majoritaire. `scores` n'est jamais inventé |
| `live_walkout` | 🚶 Entrée combattant | fighter | opponent, highlight | |
| `live_crowd` | 🔥 Ambiance / Public | highlight | | Texte libre court |
| `live_faceoff` | 👀 Face-off / Coulisses | fighter1, fighter2 | highlight | |
| `live_champion` | 🥇 Nouveau champion | winner, weightClass | loser, method, round, time, highlight | Utilise « la ceinture d'HEXAGONE MMA » |
| `live_defense` | 🛡️ Défense de titre | champion, challenger, weightClass | method, round, time, defenseCount, highlight | `defenseCount` seulement si saisi |
| `live_defeat` | ❌ Défaite | fighter, opponent | method, round, highlight | Ton respectueux, pas de dérision, règle Samba Sima désactivée |
| `live_reaction` | 🎤 Réaction combattant | fighter, quote | context | La citation est reprise **telle quelle**, entre guillemets |
| `live_moment` | 🎬 Moment fort | highlight | fighters | |

Contexte automatique depuis la Session Live : `eventName`, `eventNumber`, `venue`, `city`, `date`, `broadcast`.

`winner` : sélection par **toggle entre les deux combattants saisis**, défaut sur le premier. Pour `live_ko`, `live_sub`, `live_decision`, `live_champion`, la saisie est directement « Vainqueur » / « Perdant » pour gagner une étape.

### 7.3 Catégories DAILY & MEDIA

**SPORT**
| id | Libellé | Requis | Optionnels |
|---|---|---|---|
| `daily_fight_announce` | 📢 Annonce de combat | fighterA, fighterB, event | weightClass, cardPosition (Main / Co-main / Combat classique), date, city, venue, extra |
| `daily_fighter_intro` | 🥊 Présentation combattant | fighter | event, angle, extra (le palmarès est lu depuis la fiche, jamais saisi en libre) |
| `daily_fight_card` | 🃏 Annonce Fight Card | event | fights (sélection multiple depuis la fight card), extra |
| `daily_main_event` | 👑 Main / Co-main Event | fighterA, fighterB, event, cardPosition | weightClass, title (toggle), stakes |
| `daily_faceoff` | ⚔️ Face-off | fighterA, fighterB | event, context |
| `daily_sport_news` | 📈 Actualité sportive | subject | fighters, details, link |
| `daily_retro` | 🎞️ Rétrospective | subject | event, fighters, period, details |

**ÉVÉNEMENT**
| id | Libellé | Requis | Optionnels |
|---|---|---|---|
| `daily_ticketing` | 🎟️ Billetterie | event | priceInfo (uniquement si fourni), ticketLink, promoAngle, cta |
| `daily_countdown` | ⏳ Compte à rebours | event, daysLeft | highlightFight |
| `daily_event_announce` | 📍 Annonce événement | event | date, city, venue, extra |
| `daily_fight_week` | 🔥 Fight Week | event | dayProgram, highlightFight |
| `daily_program` | 📆 Programme | event, schedule | extra (horaires saisis uniquement) |
| `daily_last_seats` | 🎫 Dernières places | event | ticketLink, urgencyNote |

**MÉDIAS** (formulaire commun « Présence médiatique », le type de média pré-règle `mediaType`)
| id | Libellé | Requis | Optionnels |
|---|---|---|---|
| `media_press` | 📰 Relais presse | person, media | title, journalist, date, link, topic |
| `media_interview` | 🎙️ Interview | person, media | showName, journalist, airDate, airTime, topic, link |
| `media_tv` | 📺 Passage TV | person, media, airDate | showName, presenter, airTime, topic |
| `media_radio` | 📻 Radio | person, media | showName, airDate, airTime, topic, link |
| `media_podcast` | 🎧 Podcast | person, showName | host, topic, link |
| `media_youtube` | ▶️ YouTube | person, channel | videoTitle, topic, link |
| `media_portrait` | 👤 Portrait médiatique | person, media | angle, link |
| `media_fighter_news` | 📡 Combattant dans les médias | fighter, media | topic, link, date |

**COMMUNICATION**
| id | Libellé | Requis | Optionnels |
|---|---|---|---|
| `comm_partner` | 🤝 Partenaire | partnerName | partnershipType, details, link |
| `comm_news` | 🏢 Actualité HEXAGONE MMA | subject | details, link |
| `comm_statement` | 📣 Communiqué | subject, body | — |
| `comm_thanks` | 🙏 Remerciements | target | event, details |
| `comm_institutional` | 🏆 Annonce institutionnelle | subject | details, date |

`person` accepte un combattant de la base (combobox) ou un nom libre.

### 7.4 Règles éditoriales et linter (`lib/editorial/linter.ts`)

Le linter s'applique à **toute** sortie (native, IA, édition CM) et renvoie `{ text, fixes[], warnings[] }`.

Corrections automatiques (`fixes`, affichées en discret sous la variante : « 1 correction éditoriale appliquée ») :
1. `\bd['’]HEXAGONE MMA\b` → `de HEXAGONE MMA`, **sauf** si précédé de `ceinture` ou `titre` (fenêtre de 3 mots).
2. `\b(ceinture|titre) de HEXAGONE MMA\b` → `$1 d'HEXAGONE MMA`.
3. Variantes de casse du nom (`Hexagone MMA`, `hexagone mma`) → `HEXAGONE MMA` dans le texte, hashtags exclus.
4. Doublons de hashtags supprimés (comparaison insensible à la casse).
5. Espaces typographiques français : espace insécable avant `! ? : ;` (configurable), pas d'espace double.

Avertissements (`warnings`, non bloquants) :
- Plus de N emojis (seuil = p90 du profil de style du mode, 6 par défaut si le profil est insuffisant).
- Accroche identique ou trop proche (Jaccard ≥ 0,7 sur les mots) d'une des 20 dernières générations validées.
- Formules d'IA interdites (liste éditable) : « Dans un monde », « Il est important de noter », « Cette initiative vise à », « Plongez dans », « N'hésitez pas à », « Préparez-vous à vivre », « véritable » en ouverture, etc.
- Question finale ajoutée alors que la catégorie ne s'y prête pas (live_result, live_ko, live_sub, live_decision, live_defeat).
- Dépassement de limite plateforme.
- Règle Samba Sima : si `Samba Sima` apparaît dans un contexte positif sans qualificatif de la liste éditable (« crack », « phénomène », « pépite »...), suggestion d'ajout. Jamais en `live_defeat`.

Toutes les règles sont stockées en base (`rules`), modifiables par l'administrateur dans `/editorial`, avec activation par case.

**Critères de validation**
- Tests unitaires couvrant chaque règle, notamment : « la victoire d'HEXAGONE MMA » → « la victoire de HEXAGONE MMA » ; « la ceinture de HEXAGONE MMA » → « la ceinture d'HEXAGONE MMA » ; « le titre d'HEXAGONE MMA » inchangé.
- Le registre expose 12 catégories LIVE et 26 catégories DAILY, chacune avec au moins un champ requis.

---

## 8. PHASE 3 : INTELLIGENCE ÉDITORIALE (BRAND VOICE EXTRACTOR)

Objectif : transformer la bibliothèque en un **profil de style mesurable par mode**, utilisé par les deux moteurs. Tout est calculé, rien n'est supposé.

### 8.1 Corpus
- Par défaut : `wordings` où `isDemo = false` et `isReference = true`, filtrés par mode. Les deux modes sont **toujours** analysés séparément.
- Option dans l'UI : inclure les exemples de démonstration (avec bandeau d'avertissement).

### 8.2 Pré-traitement (`text-utils.ts`)
- Segmentation en graphèmes avec `Intl.Segmenter` (emojis composés comptés comme un caractère visuel).
- Emojis : `/\p{Extended_Pictographic}(‍\p{Extended_Pictographic}|️)*/gu`.
- Hashtags : `/#[\p{L}\p{N}_]+/gu`. Mentions : `/@[\w.]+/g`. URLs.
- Lignes, paragraphes (séparés par ligne vide), phrases (ponctuation forte).
- Normalisation pour le comptage : minuscules, accents retirés, emojis/hashtags/URLs retirés, liste de mots vides français (`stopwords-fr.ts`, environ 200 mots) appliquée.

### 8.3 Indicateurs calculés (`StyleProfile` par mode)

```ts
interface StyleProfile {
  id: string; mode: Mode; createdAt: string; corpusSize: number; corpusIds: string[];
  confidence: 'insufficient' | 'low' | 'medium' | 'high';  // <5 | 5-14 | 15-49 | ≥50 posts
  status: 'proposed' | 'validated';  validatedBy?: string;

  length:    { charsMean: number; charsMedian: number; charsP90: number; linesMedian: number; paragraphsMedian: number };
  emojis:    { top: { emoji: string; count: number; share: number }[]; perPostMedian: number; perPostP90: number;
               lineStartRatio: number; /* part des lignes qui commencent par un emoji */ };
  hashtags:  { top: { tag: string; count: number }[]; perPostMedian: number; position: 'end' | 'inline' | 'mixed' };
  hooks:     { samples: string[];                     // premières lignes réelles (consultation uniquement)
               patterns: { pattern: string; count: number }[];  // voir 8.4
               uppercaseRatio: number; exclamationRatio: number; questionRatio: number; avgWords: number };
  ctas:      { top: { text: string; count: number }[] };
  ngrams:    { bigrams: Ngram[]; trigrams: Ngram[]; quadgrams: Ngram[] };   // expressions récurrentes
  vocabulary:{ top: { word: string; count: number }[] };
  structures:{ fingerprint: string; count: number }[];  // voir 8.5
  overused:  { expression: string; share: number }[];   // voir 8.6
  punctuation:{ exclamationPerPost: number; ellipsisPerPost: number; uppercaseWordRatio: number };
}
```

### 8.4 Accroches
- Accroche = première ligne non vide (ou première phrase si la première ligne dépasse 140 caractères).
- **Patron d'accroche** : on remplace les noms propres connus (combattants, événements de la base) par `{NOM}`/`{EVENT}`, les nombres par `{N}`, les emojis par `{E}`, et on garde les 3 premiers mots restants. Exemple : `🔥 KO DE DUPONT AU R1 !` → `{E} ko de {NOM} au {N}`. Les patrons fréquents (≥ 2 occurrences) guident le moteur natif **sans recopier** le texte d'origine.

### 8.5 Empreinte de structure
Chaque post est résumé par une séquence de blocs : `H` (accroche), `B` (paragraphe de corps), `I` (ligne d'information factuelle : date, lieu, diffusion), `Q` (citation), `C` (CTA), `T` (bloc hashtags), `S` (signature). Exemple : `H-B-I-C-T`. Les empreintes les plus fréquentes par catégorie servent de squelettes au moteur natif.

### 8.6 Expressions surutilisées
Une expression (n-gramme de 2 à 4 mots ou patron d'accroche) présente dans plus de **25 %** des posts d'un mode, sur un corpus d'au moins 15 posts, est signalée « À varier ». Le moteur la pénalise (section 10.6).

### 8.7 CTA
Détection sur les deux dernières lignes hors hashtags, par lexique éditable (« lien en bio », « prenez vos places », « billetterie », « rendez-vous », « on vous attend », « à suivre », « en direct », verbes à l'impératif en tête de ligne).

### 8.8 Garde-fous
- Sous 5 posts dans un mode : la page affiche « Corpus insuffisant pour tirer des conclusions (N publication(s) analysée(s)) ». Les moteurs utilisent alors les valeurs par défaut documentées dans `rules.ts`.
- Chaque bloc de stats affiche le nombre de posts analysés et la date d'analyse.
- Le profil est recalculé à la demande (bouton) et automatiquement après un import de plus de 10 posts. Un nouveau profil est `proposed` ; l'administrateur le compare au profil actif (diff des indicateurs) et le valide. Seul le profil `validated` alimente les moteurs.

### 8.9 Écran ADN éditorial (`/editorial`)
Deux onglets LIVE SHOW / DAILY & MEDIA, puis un onglet « Comparer ». Visualisations simples : barres horizontales (emojis, hashtags, expressions), trois chiffres de longueur, liste des patrons d'accroche, liste « À varier », liste des empreintes de structure. Pas de graphiques décoratifs. Section « Règles éditoriales » éditable (admin).

**Critères de validation**
- Tests sur un corpus de 20 posts fixtures : emojis, hashtags, CTA et n-grammes correctement comptés ; les démos exclues par défaut ; `confidence` correcte selon la taille.
- Un corpus de 3 posts renvoie `insufficient` et aucune expression « À varier ».

---

## 9. PHASE 4 : MOTEUR DE RECHERCHE DES RÉFÉRENCES

### 9.1 Algorithme local (`lib/retrieval/scorer.ts`)
Filtre dur : `mode = brief.mode`, `isReference = true`, `isDemo = false` (sauf option démo).

Score pondéré (poids configurables dans `Settings`) :

```
score = 0.30 * sameCategory          // 1 si même catégorie, 0.5 si même groupe, sinon 0
      + 0.20 * fighterOverlap        // part des combattants du brief présents dans le post
      + 0.10 * sameEvent
      + 0.25 * textSimilarity        // BM25 normalisé entre le brief (champs texte + catégorie) et le post
      + 0.10 * samePlatform
      + 0.05 * recency               // exp(-ageJours / 365)
      - 0.15 * usedRecently          // déjà utilisé comme référence dans les 5 dernières générations
```

Index BM25 en mémoire, construit au chargement et mis à jour à chaque écriture (`lib/retrieval/index.ts`). Diversité : pas plus de 3 références avec la même empreinte de structure (MMR simplifié).

Retourne de 5 à 10 références (moins si le corpus est petit), chacune avec son score et la raison principale (« même catégorie », « même combattant »...).

### 9.2 Évolution sémantique
Prévois l'interface `Retriever` avec `LocalBm25Retriever` en v1. Documente dans le README le futur `PgVectorRetriever` (embeddings + Supabase). Pas d'implémentation factice.

### 9.3 Panneau « RÉFÉRENCES UTILISÉES »
Dans la colonne Wording Studio, panneau repliable. Liste des références avec extrait (2 lignes), catégorie, date, score et raison. Clic : ouverture du post complet dans un panneau latéral. Bouton « Exclure de cette génération » puis « Régénérer ».

**Critères de validation**
- Tests : un brief `live_ko` avec le combattant X classe en premier un post `live_ko` mentionnant X ; aucun post DAILY n'est jamais retourné pour un brief LIVE.

---

## 10. PHASE 5 : MOTEUR NATIF (SANS CLÉ API)

### 10.1 Principe
Composition à partir de **squelettes**, de **segments conditionnels** et de **banques d'accroches**, paramétrée par le profil de style. Pas de concaténation aléatoire. Déterministe à graine égale (graine = hash du brief + compteur de régénération), pour pouvoir tester.

### 10.2 DSL des modèles (`lib/generation/native/templates/*.ts`)

```ts
interface Template {
  id: string; categoryIds: string[]; variant: 'punchy' | 'signature' | 'storytelling';
  structure: string;                    // ex. 'H-B-I-T'
  segments: Segment[];
}
interface Segment {
  block: 'H' | 'B' | 'I' | 'Q' | 'C' | 'T' | 'S';
  options: string[];                    // formulations alternatives avec variables {winner}, {round}...
  requires?: string[];                  // si une variable manque : segment supprimé
  when?: (brief: Brief) => boolean;     // ex. method === 'KO'
}
```

Exemple `live_ko`, variante punchy :
```ts
{
  id: 'live_ko_punchy_1', categoryIds: ['live_ko'], variant: 'punchy', structure: 'H-B-T',
  segments: [
    { block: 'H', options: ['💥 {WINNER_UPPER} !', '💥 KO. {winner}.', '{winner} éteint la lumière 💥'], requires: ['winner'] },
    { block: 'B', options: ['{method} au {roundLabel} face à {loser}.', '{loser} n\'a pas vu venir.'], requires: ['loser'] },
    { block: 'B', options: ['{time} au chrono.'], requires: ['time'] },
    { block: 'T', options: ['{hashtags}'] }
  ]
}
```

Variables dérivées calculées par un `context builder` : `roundLabel` (« 1er round », « 2e round »), `WINNER_UPPER`, `decisionLabel` (« décision unanime »), `eventLabel` (« HEXAGONE MMA 12 » si nom et numéro connus), `dateLabel` (« samedi 14 mars » via `Intl.DateTimeFormat('fr-FR')`), noms affichés (surnom si la fiche en a un et si le modèle le prévoit).

### 10.3 Volume minimum de modèles
- Chaque catégorie : **au moins 3 modèles par variante** (9 par catégorie), avec des empreintes de structure différentes entre les trois variantes.
- Les catégories proches partagent des modèles via `categoryIds` (ex. `live_ko` et `live_sub` pour certaines structures storytelling), sans dépasser 30 % de partage.
- Priorité de rédaction des modèles : `live_ko`, `live_sub`, `live_decision`, `live_result`, `live_champion`, `daily_fight_announce`, `media_*`, `daily_ticketing`, puis le reste.

### 10.4 Définition des trois variantes
| | PUNCHY | SIGNATURE HEXAGONE (recommandée) | STORYTELLING & ENGAGEMENT |
|---|---|---|---|
| Longueur cible | ≤ 50 % de la médiane du profil, 280 car. max | médiane du profil ± 20 % | entre médiane et p90 |
| Structure | H-B(-T) | empreinte la plus fréquente de la catégorie dans le profil | H-B-B(-Q)(-C)(-T) |
| Emojis | 1 à 2 | médiane du profil | médiane du profil |
| Accroche | nominale, majuscules possibles | patron d'accroche fréquent du profil | angle différent : parcours, rivalité, enjeu |
| Question finale | jamais | selon profil | autorisée seulement pour les catégories DAILY non factuelles, une fois sur trois maximum |

La variante SIGNATURE est sélectionnée par défaut dans l'aperçu et porte le badge « Recommandée ».

### 10.5 Ingrédients issus de la bibliothèque
- **Emojis** : tirés du top du profil du mode, filtrés par pertinence de catégorie (table `emojiByCategory` : 💥 KO, 🐍 soumission, ⚖️ décision, 🏆🥇 champion, 🎟️🎫 billetterie, 📺 TV...). Si le profil est insuffisant, valeurs par défaut.
- **Hashtags** : uniquement ceux cochés par le CM dans le brief. Position selon `profile.hashtags.position`.
- **CTA** : celui saisi, sinon le CTA le plus fréquent du profil pour la catégorie, sinon aucun. Jamais de CTA billetterie en `live_defeat` ou `live_reaction`.
- **Signature** : celle choisie, rendue uniquement si ses `requiredFields` sont présents.
- **Banque d'accroches validées** : le CM peut enregistrer une accroche depuis une variante (« ⭐ Garder cette accroche »). Ces accroches, généralisées en patrons (`{winner}`), enrichissent les options du segment H.

### 10.6 Sélection et anti-répétition
Pour chaque variante : tirer les modèles éligibles (tous les `requires` du segment H satisfaits), scorer chaque rendu :
```
score = 1
      - 0.4 * similaritéAccroche(avec les 20 dernières générations validées)
      - 0.3 * présenceExpressionÀVarier
      - 0.3 * écartDeLongueur(par rapport à la cible)
```
Garder le meilleur. Les trois variantes doivent avoir des accroches dont la similarité mutuelle (Jaccard mots) est < 0,5, sinon re-tirage (5 essais maximum).

### 10.7 Post-traitement commun (`post-process.ts`), appliqué dans cet ordre
1. Nettoyage (lignes vides multiples, espaces).
2. Linter éditorial (section 7.4).
3. **Fact Guard** (`fact-guard.ts`) : extrait du texte final les nombres, horaires (`\d{1,2}h\d{0,2}`), dates, noms propres (mots capitalisés hors début de phrase), diffuseurs connus. Tout élément absent de l'ensemble « faits autorisés » (brief + session + fiches liées + signature + hashtags) produit un `FactWarning` affiché en surlignage orange avec l'infobulle « Information absente du brief : à vérifier ». Pour le moteur natif, un warning est un bug : test obligatoire.
4. **Anti-copie** (`anti-copy.ts`) : si le texte partage une séquence de 8 mots consécutifs ou plus avec une référence, ou un Jaccard sur shingles de 3 mots > 0,5, la variante est régénérée (natif) ou signalée (IA).
5. Adaptation plateforme (limites, section 12.3).

**Critères de validation**
- Test de propriété : pour 200 briefs aléatoires valides, aucun nombre, horaire ou nom propre absent du brief n'apparaît dans les sorties natives.
- Les trois variantes ont des structures différentes et des accroches non similaires.
- Génération native en moins de 50 ms pour un corpus de 2 000 wordings.

---

## 11. PHASE 6 : MOTEUR IA AVANCÉ (ANTHROPIC / OPENAI)

### 11.1 Interface d'adaptateur (`lib/ai/types.ts`)
```ts
interface AIProviderAdapter {
  id: 'anthropic' | 'openai';
  isConfigured(ctx: KeyContext): boolean;
  generate(input: GenerationInput, ctx: KeyContext, signal: AbortSignal): Promise<RawVariants>;
  refine(input: RefineInput, ctx: KeyContext, signal: AbortSignal): Promise<string>;
  decline(input: DeclineInput, ctx: KeyContext, signal: AbortSignal): Promise<Partial<Record<Platform, string>>>;
  test(ctx: KeyContext): Promise<{ ok: boolean; latencyMs: number; model: string; error?: string }>;
}
```
`registry.ts` enregistre les adaptateurs. Ajouter un fournisseur = un fichier + une ligne.

### 11.2 Routes serveur
- `POST /api/generate` : corps validé par Zod `{ brief, references[], styleProfileSummary, rules[], facts, platform }`. Timeout `AI_TIMEOUT_MS`. En cas d'erreur (réseau, 4xx, 5xx, JSON invalide après 1 nouvelle tentative), réponse `{ fallback: true, reason }` : le client lance alors le moteur natif et affiche « Génération IA indisponible ({reason}). Propositions produites par le moteur natif. »
- `POST /api/refine`, `POST /api/decline`, `POST /api/ai/test`.
- Résolution de la clé : `process.env` d'abord, sinon en-tête `x-hex-provider-key` si `ALLOW_CLIENT_KEYS` le permet. L'en-tête n'est jamais journalisé : un utilitaire `safeLog()` masque tout champ contenant `key`, `token`, `authorization`.
- Aucune donnée de requête n'est conservée côté serveur.

### 11.3 Prompt système (`lib/ai/prompts.ts`)
Construit dynamiquement, en français :

```
Tu rédiges des publications pour les réseaux sociaux de HEXAGONE MMA, ligue française de MMA.
Mode : {LIVE SHOW | DAILY & MEDIA}. Catégorie : {label}. Plateforme : {platform}.

RÈGLES ABSOLUES
- N'utilise que les faits fournis dans <faits>. N'invente aucun résultat, score, palmarès, statistique, date, horaire, diffuseur, prix ou citation.
- Si une information manque, n'en parle pas.
- Écris « de HEXAGONE MMA », jamais « d'HEXAGONE MMA ». Exception : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA ».
- {règles éditoriales actives}
- Les exemples de <references> servent uniquement à capter le ton, le rythme, la structure et le niveau d'emojis. Ne recopie aucune phrase.
- Évite : {expressions À varier} et les formules d'IA {liste}.

STYLE MESURÉ SUR LES PUBLICATIONS RÉELLES ({corpusSize} posts, confiance {confidence})
- Longueur médiane : {charsMedian} caractères, {linesMedian} lignes.
- Emojis par post : {perPostMedian} (fréquents : {top})
- Structures fréquentes : {fingerprints}
- Patrons d'accroche : {patterns}
- CTA habituels : {ctas}

TON DE LA CATÉGORIE : {category.tone}
CONTRAINTES PLATEFORME : {platformRules}

PRODUIS TROIS VARIANTES VRAIMENT DIFFÉRENTES (structure et accroche différentes)
1. punchy : {définition 10.4}
2. signature : {définition 10.4}
3. storytelling : {définition 10.4}

Réponds uniquement en JSON valide selon ce schéma : {schéma}
```

Message utilisateur :
```
<faits>{JSON des faits autorisés}</faits>
<brief>{champs + consigne libre éventuelle}</brief>
<references>
  <reference categorie="..." date="...">...</reference>  (5 à 10)
</references>
<hashtags_autorises>...</hashtags_autorises>
<signature>{signature rendue ou vide}</signature>
```

Schéma de sortie (Zod, `lib/ai/schema.ts`) :
```ts
{ variants: [{ kind: 'punchy'|'signature'|'storytelling', hook: string, text: string, usedFacts: string[] }] }  // exactement 3
```
Si le fournisseur propose une sortie structurée native, l'utiliser ; sinon parser le JSON et valider. Après validation, la sortie passe par le même post-traitement que le natif (linter, Fact Guard, anti-copie).

### 11.4 Retouche (`/api/refine`)
Actions : `shorten`, `punchier`, `institutional`, `new_hook`, `toggle_emojis`, `rephrase`, `regenerate`, `custom`.
Le prompt transmet le texte courant, l'action, la consigne libre, les faits autorisés, et impose : « Ne modifie que ce qui est demandé. Conserve toutes les informations factuelles. » Pour `new_hook`, seule la première ligne peut changer : le serveur vérifie que le reste du texte est identique et rejette sinon.

En mode natif, chaque action a une implémentation locale réelle :
- `shorten` : suppression des segments optionnels B par ordre de priorité, puis du CTA, jusqu'à la longueur cible.
- `punchier` : bascule vers un modèle punchy du même squelette pour l'accroche, phrases > 15 mots coupées.
- `institutional` : modèles `tone: institutional`, emojis limités à 1.
- `new_hook` : nouveau tirage du segment H uniquement.
- `toggle_emojis` : retrait de tous les emojis ou ajout selon la médiane du profil.
- `rephrase` : nouveau tirage des options de chaque segment avec la même structure.
- `regenerate` : nouveau modèle, nouvelle graine.
- `custom` : en mode natif, affiché désactivé avec l'infobulle « Consigne libre disponible avec un moteur IA connecté ».

Chaque action crée une nouvelle `Revision`. Rien n'est écrasé.

### 11.5 Écran Paramètres > Intelligence artificielle
- Choix du moteur : Natif / Claude (Anthropic) / OpenAI.
- Statut par fournisseur : « Configuré via .env », « Clé de session », « Non configuré ».
- Champ de clé (type password) si autorisé, avec la mention « Conservée uniquement pour cette session de navigateur. Jamais enregistrée. »
- Modèle utilisé (lu depuis le serveur, non modifiable dans l'UI si défini en .env).
- Bouton « Tester la connexion » : vrai appel minimal, affiche latence et modèle, ou l'erreur exacte.
- L'indicateur du header reflète l'état réel : `Natif`, `Claude · connecté`, `OpenAI · erreur`.

**Critères de validation**
- Test : la route `/api/generate` sans clé renvoie `fallback: true`.
- Test : aucun log ne contient la valeur de clé passée en en-tête (spy sur `console`).
- Test : une sortie IA contenant une date absente des faits produit un `FactWarning`.
- `grep -r "sk-" .next/static` ne renvoie rien après `npm run build`.

---

## 12. PHASE 7 : SHELL DE L'APPLICATION

### 12.1 Sidebar (repliable, état mémorisé dans localStorage)
```
WORKSPACE     Dashboard · Social Studio · LIVE SHOW · DAILY & MEDIA
RESSOURCES    Bibliothèque de wordings · Combattants · Événements · Hashtags & signatures · ADN éditorial
SUIVI         Historique · Publications validées
PARAMÈTRES    Intelligence artificielle · Préférences · Gestion des données · Utilisateurs
```
Largeur 232 px, repliée 56 px (icônes + tooltip). « LIVE SHOW » et « DAILY & MEDIA » ouvrent le Studio dans le mode correspondant.

### 12.2 Header (hauteur 52 px, fixe)
- **Gauche** : logo HEXAGONE MMA (image uploadée dans Préférences, placeholder hexagonal sobre sinon), « SOCIAL STUDIO ».
- **Centre** : **ModeSwitcher**, segmented control à deux positions. LIVE SHOW (rouge, pastille ON AIR) / DAILY & MEDIA (or). Raccourci `Alt+L` / `Alt+D`. Le changement met à jour `data-mode`, les catégories, les champs, les références, le profil de style, les modèles. Les champs communs (combattants, événement) sont conservés dans le store ; la catégorie est réinitialisée vers la dernière utilisée dans ce mode.
- **Droite** : recherche globale (`Cmd/Ctrl+K`, palette de commandes : wordings, combattants, événements, actions), accès bibliothèque, indicateur moteur IA, indicateur synchro fichier (« Sauvegardé · il y a 3 s »), paramètres, profil utilisateur (nom + rôle).

### 12.3 Barre Session Live
Visible sous le header en mode LIVE SHOW uniquement.
- Sans session : bouton « Démarrer une Session Live ». Modale : sélection d'un événement de la base (pré-remplit tout) ou saisie rapide (nom, numéro, salle, ville, date, diffusion, billetterie). Tous les champs sauf le nom sont facultatifs.
- Avec session : bandeau compact `● ÉVÉNEMENT ACTIF · HEXAGONE MMA 12 · Paris · Diffusion : RMC SPORT` + boutons « Modifier » et « Terminer ». Terminer demande confirmation et archive la session (`endedAt`).
- Une seule session active à la fois. Elle survit à l'actualisation.

**Critères de validation**
- Navigation complète au clavier, sidebar repliable, mode persistant après actualisation.

---

## 13. PHASE 8 : LE SOCIAL STUDIO

### 13.1 Mise en page desktop (≥ 1280 px)
Grille `32% / 40% / 28%`, hauteur `100vh - header - barre session`. Chaque colonne a son propre défilement (`overflow-y: auto`), en-têtes de colonne collants. Confortable à 1440 px. Entre 1024 et 1279 px : la colonne Aperçu devient un panneau escamotable à droite.

### 13.2 Mobile et tablette (< 1024 px)
Trois onglets en haut : **1. Saisie · 2. Résultats · 3. Aperçu**, avec pastille de notification sur Résultats quand une génération arrive. Après « Générer », bascule automatique sur Résultats. Bouton « Générer » collant en bas de l'onglet Saisie (hauteur 52 px, pleine largeur, couleur d'accent). Contrôles 44 px minimum. Pas de colonnes réduites.

### 13.3 Colonne 1 : BRIEF

Ordre vertical :
1. **Plateforme principale** : toggle group Instagram / Facebook / X / TikTok (défaut Instagram, mémorisé par mode).
2. **CategoryPills**
   - LIVE : grille de 12 pills (3 colonnes desktop, 2 mobile), emoji + libellé en majuscules, hauteur 40 px. Raccourcis `1` à `9`, `0`, `-`, `=` quand le focus n'est pas dans un champ ; le numéro s'affiche en petit (`Kbd`) dans la pill. Une pill sélectionnée prend l'accent plein.
   - DAILY : 4 groupes repliables (SPORT, ÉVÉNEMENT, MÉDIAS, COMMUNICATION), le groupe de la dernière catégorie utilisée ouvert. Champ filtre « Rechercher une catégorie ».
   - Sélectionner une catégorie affiche immédiatement le formulaire et place le focus sur le premier champ requis.
3. **DynamicForm** généré depuis le registre (section 7).
   - `FighterCombobox` : recherche floue sur nom, prénom, surnom dès 2 caractères, navigation flèches + `Entrée`. Si inconnu : « Utiliser “Xxx” » (texte libre) ou « Créer la fiche ». Les fighters de la fight card de l'événement actif apparaissent en premier.
   - `QuickChips` pour round, méthode, diffusion, type de décision, type de soumission. Un clic sélectionne, un second clic désélectionne. Navigation flèches.
   - Champ `time` avec masque `m:ss` (saisie « 312 » → « 3:12 »).
   - Toggle vainqueur entre les deux combattants (`live_result`).
   - Champs requis marqués d'un point d'accent ; validation au clic sur Générer, message précis sous le champ.
4. **Hashtags** : groupes avec cases à cocher, état par défaut selon `defaultOn` et le mode. Aperçu des hashtags qui seront ajoutés.
5. **Signature** : sélecteur (Aucune / signatures du mode). Si des champs requis manquent : « Signature incomplète : date, salle manquantes » et elle n'est pas ajoutée.
6. **CTA** : chips des CTA fréquents du profil + saisie libre.
7. **Consigne particulière** (DAILY uniquement au niveau du brief, toujours disponible au niveau des variantes).
8. **Bouton GÉNÉRER LES WORDINGS** (`Cmd/Ctrl+Entrée`, fonctionne aussi depuis un champ). États : défaut, chargement (spinner + « Génération… »), désactivé si catégorie non choisie.

**Brouillon automatique** : le brief en cours est sauvegardé dans le store persistant (debounce 300 ms). Bouton « Réinitialiser » (conserve la Session Live).

**Chronométrage LIVE** (dev uniquement) : un test e2e mesure le parcours `live_ko` : 6 interactions maximum, génération affichée en moins de 1 s en mode natif.

### 13.4 Colonne 2 : WORDING STUDIO

**État vide** : rappel du parcours et des raccourcis, pas d'illustration.
**Chargement** : trois skeletons de cartes.

**VariantCard** (×3, ordre : Signature en premier avec badge « Recommandée », puis Punchy, puis Storytelling ; l'ordre est paramétrable)
- En-tête : type de variante, moteur d'origine (Natif / Claude / OpenAI), compteur de caractères (Instagram : graphèmes ; X : compteur pondéré `twitter-text` avec anneau qui passe en orange à 260, rouge au-delà de 280), bouton radio « Afficher dans l'aperçu ».
- **Éditeur** : `textarea` auto-redimensionné, police 14 px, interligne 1,6. L'édition met à jour l'aperçu à chaque frappe. Sauvegarde automatique (debounce 500 ms) en tant que nouvelle `Revision` d'origine `cm_edit` (fusion des frappes successives dans une même révision tant que l'utilisateur n'a pas quitté le champ plus de 5 s).
- Surlignage des `FactWarning` (calque superposé ou liste sous l'éditeur, cliquable pour sélectionner le passage).
- Ligne de corrections éditoriales appliquées (repliée).
- **RefineBar** : ⚡ Raccourcir · 🔥 Plus percutant · 📰 Plus institutionnel · 🎯 Nouvelle accroche · 😊 Emojis +/- · ✍️ Reformuler · 🔄 Régénérer. Chaque bouton montre un état de chargement propre à la carte.
- Champ « Une consigne particulière ? » + bouton Appliquer (`Entrée`). Désactivé avec explication en mode natif.
- **RevisionTimeline** : pastilles v1, v2, v3… avec origine et action ; clic pour revenir à une révision (crée une nouvelle révision, rien n'est perdu) ; bouton « Voir les différences » (diff mot à mot).
- Actions : **Copier** (toast « Copié »), **⭐ Garder l'accroche**, **Enregistrer dans la bibliothèque** (ouvre la fiche pré-remplie, statut `validated`), **Valider** (statut de la génération → `validated`, variante marquée finale, état visuel coché), **Marquer comme publié** (dans le menu « … », confirmation, demande la date et le lien éventuel).

**Sous les cartes**
- Bouton **DÉCLINER SUR LES AUTRES RÉSEAUX** : depuis la variante sélectionnée, produit une version par plateforme non principale. Natif : réapplication des règles plateforme (raccourcissement X, accroche immédiate TikTok, contexte supplémentaire Facebook si des champs optionnels existent). IA : `/api/decline`. Résultat affiché dans un panneau à onglets, chaque version éditable et copiable.
- Panneau **RÉFÉRENCES UTILISÉES** (section 9.3).
- Bandeau de bascule si le moteur IA a échoué.

### 13.5 Colonne 3 : LIVE PREVIEW

- **PlatformSwitcher** : Instagram / Facebook / X / TikTok (indépendant de la plateforme principale, défaut identique).
- Bandeau permanent : « Simulation éditoriale : le rendu réel varie selon l'appareil et l'application. »
- Cadre téléphone sobre (largeur 375 px logique, mis à l'échelle pour tenir dans la colonne).

**InstagramPreview**
- En-tête : avatar (logo), nom de compte configurable (Préférences, défaut `hexagonemma`), « … ».
- Média : ratio 4:5, image uploadée (glisser-déposer ou bouton « Changer l'image », stockée en blob dans IndexedDB), placeholder neutre sinon. Option vidéo : affiche une icône Reel sur le placeholder.
- Barre d'actions (icônes cœur, commentaire, partage, enregistrer, en gris neutre, sans chiffre inventé : « Aimé par … » remplacé par une ligne grisée).
- Légende : nom de compte en gras + texte. Hashtags et mentions en couleur lien.
- **Coupure « … plus »** (`lib/platforms/truncation.ts`) :
  1. Seuil `N` = `settings.igTruncation` (défaut 125, réglable de 60 à 300 dans un slider de la colonne).
  2. Calcul sur graphèmes (`Intl.Segmenter`).
  3. La partie visible s'arrête au premier des deux : `N` graphèmes, ou fin de la 2e ligne de texte.
  4. Si la coupure tombe au milieu d'un mot, recul jusqu'à l'espace précédent (sauf si le mot dépasse 20 graphèmes).
  5. Ajout de « … plus » en gris, cliquable pour déplier ; « moins » pour replier.
  6. Indicateur sous l'aperçu : « Accroche visible : 98 / 125 caractères » ; si l'accroche (1re ligne) est plus longue que la partie visible : avertissement « L'accroche est coupée avant “plus” ».
- Interrupteur **« Afficher uniquement la partie visible avant PLUS »** : masque le reste et grise la zone pour juger la force de l'accroche.
- Pied : « Il y a quelques secondes ».

**FacebookPreview** : en-tête page, texte complet avec coupure « Voir plus » simulée (seuil configurable, défaut 480 caractères), média 1:1 ou 16:9.
**XPreview** : avatar, nom, handle, texte, compteur pondéré bien visible, zone rouge sur la partie au-delà de 280.
**TikTokPreview** : ratio 9:16, légende en surimpression en bas à gauche sur 2 lignes avec « plus », colonne d'icônes à droite.

- Bouton **« Retour à la modification »** : met le focus dans l'éditeur de la variante affichée (sur mobile, bascule sur l'onglet Résultats).
- L'aperçu se met à jour à chaque sélection de variante, frappe, changement d'image ou de plateforme, sans saccade (rendu mémoïsé, pas de debounce visible au-delà de 50 ms).

### 13.6 Raccourcis clavier (`useShortcuts`)
| Raccourci | Action | Actif dans un champ |
|---|---|---|
| `Cmd/Ctrl + Entrée` | Générer | Oui |
| `Cmd/Ctrl + Shift + C` | Copier la variante sélectionnée (ou le texte sélectionné s'il y en a un) | Oui |
| `Alt + 1/2/3` | Sélectionner la variante 1/2/3 | Oui |
| `1…9, 0, -, =` | Catégorie LIVE | Non |
| `Alt + L / Alt + D` | Changer de mode | Oui |
| `Cmd/Ctrl + K` | Recherche globale | Oui |
| `Échap` | Fermer modale, panneau, palette | Oui |

Note : `Cmd+Shift+C` est aussi utilisé par l'inspecteur de Chrome sur macOS quand les DevTools sont ouverts. Appeler `preventDefault`, et proposer `Cmd/Ctrl + Alt + C` comme alternative configurable dans Préférences. Une aide « ? » liste les raccourcis.

### 13.7 Persistance de la génération
Chaque clic sur Générer crée une `Generation` (`status: draft`). La première édition passe le statut à `editing`. Toutes les révisions sont conservées. Rouvrir une génération depuis l'historique restaure le brief, les variantes, la révision courante et l'aperçu.

**Critères de validation**
- Les trois colonnes défilent indépendamment à 1440 px.
- Sur viewport 390 × 844, les onglets remplacent les colonnes.
- Éditer une variante met à jour l'aperçu en temps réel ; la coupure respecte le seuil réglé.
- Le parcours LIVE KO tient en 6 interactions.

---

## 14. PHASE 9 : BIBLIOTHÈQUE « BASE WORDINGS & ADN »

### 14.1 Liste
- Vues **liste** (dense, une ligne par post) et **grille** (cartes 3 lignes). Choix mémorisé.
- Filtres : texte (BM25 + recherche exacte entre guillemets), mode, catégorie, combattant, événement, plage de dates, plateforme, tags, statut, source, « inclure les exemples fictifs ».
- Tri : date, pertinence, dernière modification.
- Pagination virtuelle (fluide à 5 000 posts).
- Actions par post : consulter, modifier, dupliquer, copier, supprimer (confirmation), basculer « Référence de style » on/off.
- Badge `EXEMPLE FICTIF` sur les démos, badge `Publié` / `Validé`.

### 14.2 Ajout manuel
Formulaire : texte intégral (seul champ requis), mode, catégorie (suggérée automatiquement par le classifieur, modifiable), combattants (multi-combobox), événement, date, plateforme, lien Instagram, hashtags (extraits automatiquement du texte, modifiables), CTA (détecté, modifiable), tags, commentaires internes. Détection de doublon avant enregistrement.

### 14.3 Import en masse (modale en 3 étapes)
1. **Coller** : zone de texte. Séparateur : ligne contenant uniquement `===` (regex `/^\s*={3,}\s*$/m`). Compteur en direct « 23 publications détectées ».
2. **Vérifier** : tableau, une ligne par publication : extrait, mode suggéré, catégorie suggérée (select modifiable), plateforme, statut doublon (`Nouveau` / `Doublon exact` / `Très proche de …`), case « Importer ». Actions groupées : appliquer un mode, une catégorie, une plateforme à la sélection. Fusionner deux lignes, scinder une ligne.
3. **Confirmer** : résumé (N nouveaux, M doublons ignorés), bouton unique « Importer N publications ». Les doublons sont ignorés par défaut ; « Remplacer » demande une confirmation explicite.

**Classifieur** (`lib/import/classifier.ts`) : règles par mots-clés et emojis pondérés par catégorie (ex. `ko|k.o|tko|💥` → `live_ko` ; `soumission|étranglement|guillotine|🐍` → `live_sub` ; `billetterie|places|🎟️` → `daily_ticketing` ; `interview|micro|🎙️` → `media_interview`), plus le meilleur score BM25 contre les posts déjà catégorisés quand la bibliothèque en contient au moins 30. Retourne catégorie, mode et un score de confiance ; sous 0,4 : « À catégoriser » mis en évidence.

**Doublons** (`lib/import/dedupe.ts`) : exact par `contentHash` ; proche par Jaccard sur shingles de 3 mots ≥ 0,85. Testé sur les doublons internes au lot et contre la base.

### 14.4 Import CSV et Excel
Colonnes reconnues (en-têtes insensibles à la casse et aux accents) : `texte` (requis), `mode`, `categorie`, `combattants` (séparés par `;`), `evenement`, `date`, `reseau`, `lien`, `hashtags`, `cta`, `tags`, `commentaire`. Écran de mapping si les en-têtes diffèrent. Passe ensuite par l'étape « Vérifier » de 14.3. Modèle CSV téléchargeable.

### 14.5 Import Instagram
- **Coller un texte** + champ lien optionnel (stocké, jamais appelé).
- **Fichier d'export Instagram** (« Télécharger vos informations » de Meta, format JSON) : parseur défensif qui cherche les légendes dans les structures connues (`media[].title`, `title`, `string_map_data`), récupère la date (`creation_timestamp`). Corrige l'encodage des exports Meta (texte UTF-8 encodé en séquences `\u00XX`) en ré-interprétant les octets en UTF-8. Le format pouvant évoluer, afficher un aperçu avant import et un message clair si aucune légende n'est trouvée.
- Passe par l'étape « Vérifier ».
- `lib/import/instagram-api.README.md` documente une future connexion à l'API officielle Instagram (compte professionnel, autorisations Meta). Aucune implémentation, aucun scraping.

**Critères de validation**
- Import de 20 wordings collés : 20 détectés, catégories proposées, 2 doublons volontaires détectés.
- Import CSV de fixtures : mapping correct, accents préservés.
- Import JSON Instagram de fixture avec mojibake : emojis correctement restaurés.

---

## 15. PHASE 10 : COMBATTANTS, ÉVÉNEMENTS, HASHTAGS, SIGNATURES

### 15.1 Combattants
Liste filtrable (nom, catégorie de poids, club). Fiche : tous les champs du type `Fighter`, historique de combats éditable en tableau, onglets « Publications associées » (wordings liés) et « Événements ». Badge « À vérifier » si `updatedAt` > 90 jours. Le palmarès porte sa date (`asOf`) ; les moteurs l'utilisent seulement si le CM coche « Utiliser le palmarès » dans le brief, et toujours avec la formulation datée en interne (le texte final n'affiche que le chiffre, mais le Fact Guard l'autorise).

### 15.2 Événements
Liste chronologique (à venir / passés). Fiche : champs du type `HexEvent`, fight card construite par glisser-déposer depuis les combattants, diffuseurs avec horaires et case « Horaires confirmés ». Bouton « Démarrer la Session Live pour cet événement ». Les champs alimentent les formulaires du Studio.

### 15.3 Hashtags & signatures
- Groupes de hashtags : créer, renommer, réordonner, choisir les modes et l'état par défaut. Normalisation à la saisie (ajout du `#`, suppression des espaces).
- Signatures : éditeur avec variables (`{date}`, `{venue}`, `{city}`, `{broadcaster}`, `{prelimsTime}`, `{prelimsChannel}`, `{mainTime}`, `{mainChannel}`, `{ticketLink}`), champs requis, modes, activation, aperçu rendu avec l'événement actif. Une ligne dont une variable est vide est supprimée du rendu.

**Critères de validation**
- Choisir un événement dans le brief pré-remplit date, salle, ville ; la signature se rend correctement ; sans horaires confirmés, aucune ligne horaire n'apparaît.

---

## 16. PHASE 11 : HISTORIQUE, DASHBOARD, PARAMÈTRES, DONNÉES

### 16.1 Historique
Tableau : date, mode, catégorie, plateforme, moteur, statut, extrait du texte final. Filtres par statut et mode. Détail : brief initial, trois variantes avec toutes leurs révisions, diff entre génération initiale et texte final, références utilisées. Actions : rouvrir dans le Studio, enregistrer dans la bibliothèque, changer le statut.

Distinction visuelle stricte des quatre statuts (`Brouillon`, `En cours de modification`, `Validé`, `Publié`) et de l'origine de chaque révision (moteur ou CM).

**Apprentissage contrôlé** : l'écran « Publications validées » liste les générations validées non encore versées dans la bibliothèque, avec un bouton « Ajouter comme référence ». Rien n'entre automatiquement dans le corpus de style.

### 16.2 Dashboard
- Titre « Bienvenue dans votre Social Studio. »
- Bouton principal **NOUVEAU WORDING** (ouvre le Studio dans le dernier mode).
- Deux grands raccourcis **LIVE SHOW** (rouge) et **DAILY & MEDIA** (or).
- Blocs compacts : 5 dernières générations, 5 derniers wordings enregistrés, nombre de références (réelles / fictives), répartition LIVE / DAILY (une barre), Session Live active, état du moteur IA, état de la sauvegarde fichier.
- Aucun graphique décoratif.

### 16.3 Paramètres
- **Intelligence artificielle** : section 11.5.
- **Préférences** : logo, nom de compte affiché dans l'aperçu, seuil de coupure Instagram et Facebook, options rapides (rounds, méthodes, diffuseurs) éditables et réordonnables, ordre des variantes, raccourcis alternatifs, espaces insécables, poids du moteur de recherche (avancé).
- **Gestion des données** :
  - Export JSON intégral (toutes les tables + `schemaVersion`, sans aucune clé), export CSV de la bibliothèque, export Excel (une feuille par table).
  - Import JSON : aperçu des volumes, stratégie « Fusionner » (défaut, doublons ignorés) ou « Remplacer » (double confirmation, sauvegarde préalable automatique).
  - Restaurer depuis le fichier local ou une sauvegarde de `data/backups/`.
  - Supprimer les exemples fictifs.
  - Réinitialiser l'application (triple confirmation, export automatique avant).
- **Utilisateurs** : profils locaux (nom, rôle CM / admin), sélection du profil actif. Mention claire : « Contrôle de rôle local, sans authentification. » Les écrans ADN et Règles exigent le rôle admin pour valider ou modifier.

### 16.4 Micro-interactions
- Toasts : copie, sauvegarde, validation, import, erreur (avec action « Réessayer » quand c'est pertinent).
- Skeletons sur les listes et les variantes.
- Messages d'erreur précis (« La clé Anthropic est refusée (401). Vérifiez-la dans Paramètres > IA. »).
- Animation de changement de mode : transition de couleur 150 ms, rien d'autre.
- Respect de `prefers-reduced-motion`.

**Critères de validation**
- Export JSON → réinitialisation → import JSON : données identiques (test e2e).
- Export CSV ouvrable dans un tableur avec accents et emojis corrects (BOM UTF-8).

---

## 17. PHASE 12 : TESTS, QA ET README

### 17.1 Tests unitaires (Vitest) obligatoires
Linter éditorial · troncature Instagram · compteur X · séparateur `===` · classifieur · doublons · extracteur de style · retrieval · moteur natif (structures distinctes, aucune invention, anti-répétition) · Fact Guard · anti-copie · rendu des signatures · round-trip export/import · masquage des clés dans les logs.

### 17.2 Scénarios e2e (Playwright), un fichier par scénario
1. Victoire par KO en LIVE SHOW avec Session Live active (≤ 6 interactions).
2. Victoire par décision partagée.
3. Annonce d'un nouveau champion (« la ceinture d'HEXAGONE MMA » présent).
4. Annonce de combat en DAILY & MEDIA depuis une fiche événement.
5. Passage TV (présence médiatique).
6. Import de 20 wordings collés avec 2 doublons.
7. Recherche d'un ancien wording similaire dans la bibliothèque.
8. Génération affichant les bonnes références dans « Références utilisées ».
9. Modification d'une variante, révisions et retour arrière.
10. Copie et enregistrement d'un wording dans la bibliothèque.
11. Export JSON puis réimport JSON.
12. Parcours complet sur viewport mobile (onglets).
13. Persistance après actualisation (brief en cours, génération, Session Live).
14. Contraintes éditoriales (« d'HEXAGONE MMA » corrigé, Samba Sima, aucune date inventée).
15. Sécurité : aucune clé dans le bundle ni dans l'export JSON ; fallback natif sans clé.

### 17.3 Vérifications finales
- `npm run build` sans avertissement bloquant.
- Audit manuel : chaque bouton visible déclenche une action réelle. Lister dans `PROGRESS.md` tout élément désactivé et pourquoi.
- Lighthouse accessibilité ≥ 90 sur Studio et Bibliothèque.

### 17.4 README.md
Installation · lancement · structure du projet · fonctionnement de la base locale (IndexedDB + fichier `data/`) · sauvegarde et restauration · importation des wordings (formats, séparateur, CSV, export Instagram) · fonctionnement du moteur natif et de ses limites · configuration des clés API (`.env.local`, clé de session) · ajout d'un fournisseur IA · ajout d'une catégorie ou d'un modèle natif · évolution Supabase et pgvector · lancement des tests.

---

## 18. ANNEXE A : ORDRE DE PRIORITÉ EN CAS DE MANQUE DE TEMPS

Si une phase prend plus de temps que prévu, ne sacrifie jamais la qualité de :
1. Studio trois colonnes + deux modes + parcours LIVE rapide.
2. Moteur natif, trois variantes, édition et révisions.
3. Bibliothèque, import en masse, recherche de références.
4. Aperçu Instagram avec coupure, déclinaison réseaux.
5. ADN éditorial, combattants, événements.
6. Moteur IA, imports CSV/Excel/Instagram, exports.

Une fonctionnalité simple qui marche vaut mieux qu'une fonctionnalité impressionnante mais fictive.

## 19. ANNEXE B : DÉFINITION DU « TERMINÉ »

L'application est terminée quand un Community Manager de HEXAGONE MMA peut, sans clé API :
- ouvrir l'application pendant un gala, démarrer une Session Live et publier un post de KO en moins de 30 secondes ;
- préparer une annonce de combat ou un passage TV au bureau avec le même niveau de simplicité ;
- coller 50 anciens posts, les voir analysés séparément pour LIVE et DAILY, et constater que les propositions suivantes reprennent leur rythme sans les recopier ;
- fermer le navigateur, revenir le lendemain et retrouver tout son travail, y compris dans le fichier `data/hexagone-studio.json`.

Le CM reste maître de la rédaction et de la validation finale.
