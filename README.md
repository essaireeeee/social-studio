# HEXAGONE MMA · Social Studio

> Your voice. Your fight. Your content.

Outil interne de production éditoriale pour les Community Managers de HEXAGONE MMA. Il rédige des publications Instagram, Facebook, X et TikTok à partir d'une mémoire éditoriale : les posts réellement publiés par la ligue.

Deux univers séparés : **LIVE SHOW** (pendant un gala, vitesse maximale) et **DAILY & MEDIA** (annonces, billetterie, médias). Chacun a ses catégories, ses références et son profil de style. L'application fonctionne entièrement sans clé API, avec le moteur natif ; Claude ou OpenAI peuvent prendre le relais.

Le cahier des charges est dans [`PROMPT.md`](./PROMPT.md), le journal des phases dans [`PROGRESS.md`](./PROGRESS.md), les règles de travail dans [`CLAUDE.md`](./CLAUDE.md).

## Sommaire

- [Installation](#installation)
- [Lancement](#lancement)
- [Écrans](#écrans)
- [Interface : thèmes, iPhone, application installable](#interface--thèmes-iphone-application-installable)
- [Structure du projet](#structure-du-projet)
- [Base locale : IndexedDB et dossier `data/`](#base-locale--indexeddb-et-dossier-data)
- [Sauvegarde et restauration](#sauvegarde-et-restauration)
- [Importer des wordings](#importer-des-wordings)
- [Moteur natif : fonctionnement et limites](#moteur-natif--fonctionnement-et-limites)
- [Clés API : `.env.local` et clé de session](#clés-api--envlocal-et-clé-de-session)
- [Ajouter un fournisseur IA](#ajouter-un-fournisseur-ia)
- [Ajouter une catégorie ou un modèle natif](#ajouter-une-catégorie-ou-un-modèle-natif)
- [Recherche des références](#recherche-des-références)
- [Évolution : Supabase et pgvector](#évolution--supabase-et-pgvector)
- [Tests](#tests)
- [Raccourcis clavier](#raccourcis-clavier)

## Installation

Prérequis : Node.js 22 ou plus récent, npm 10.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Sans clé API, tout fonctionne avec le moteur natif. Les clés éventuelles vont uniquement dans `.env.local`, jamais dans le code (voir [Clés API](#clés-api--envlocal-et-clé-de-session)).

## Lancement

```bash
npm run dev
```

L'application tourne sur http://localhost:3000. Au premier lancement, la base locale reçoit six exemples fictifs (badge « EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE »), les règles éditoriales, deux groupes de hashtags, deux signatures et un profil administrateur.

Production :

```bash
npm run build
```

```bash
npm run start
```

| Script                            | Rôle                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                     | Serveur de développement                                                     |
| `npm run build` / `npm run start` | Build et serveur de production                                               |
| `npm run typecheck`               | Types de routes Next puis `tsc --noEmit`                                     |
| `npm run lint`                    | ESLint sur tout le projet                                                    |
| `npm run format` / `format:check` | Prettier (avec tri des classes Tailwind)                                     |
| `npm run test`                    | Tests unitaires Vitest (`tests/unit`)                                        |
| `npm run test:e2e`                | Tous les tests Playwright (`tests/e2e`)                                      |
| `npm run test:scenarios`          | Les 15 scénarios de recette (`tests/e2e/scenarios`)                          |
| `npm run check:bundle`            | Après un build : aucune clé, aucun SDK ni hôte de fournisseur IA côté client |
| `npm run check:pwa`               | Serveur de production lancé : service worker, installabilité, hors ligne     |
| `npm run screenshots`             | Captures de revue (iPhone et desktop, jour et nuit) dans `tests/screenshots` |

## Écrans

| Écran                             | Rôle                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Accueil (`/`)                     | NOUVEAU WORDING, accès LIVE SHOW / DAILY & MEDIA, dernières générations et publications, références, état de l'outil.     |
| Social Studio (`/studio`)         | Brief, trois variantes éditables avec leurs versions, aperçu Instagram, Facebook, X, TikTok, déclinaison sur les réseaux. |
| Bibliothèque (`/library`)         | Publications de la ligue : recherche, filtres, liste ou grille, fiche, imports.                                           |
| Combattants, Événements           | Fiches datées (« À vérifier » après 90 jours), palmarès daté, fight card, diffuseurs et horaires confirmés.               |
| Hashtags & signatures             | Groupes de hashtags, signatures à variables avec aperçu sur un événement.                                                 |
| ADN éditorial (`/editorial`)      | Profil de style mesuré par mode, comparaison, validation par un administrateur, règles éditoriales.                       |
| Historique, Publications validées | Toutes les générations et leurs statuts ; versement contrôlé des textes validés dans la bibliothèque.                     |
| Paramètres (`/settings`)          | Intelligence artificielle, Préférences (dont Apparence), Gestion des données, Utilisateurs (rôles locaux).                |
| Plus (`/plus`, mobile)            | Tous les écrans hors tab bar, en cellules groupées.                                                                       |

Une **Session Live** (barre sous la barre de navigation, en LIVE SHOW) garde l'événement en cours : ses informations pré-remplissent les briefs du gala.

## Interface : thèmes, iPhone, application installable

L'interface reprend les principes d'iOS (sans icônes SF Symbols ni polices SF embarquées) : barre de navigation translucide à grand titre, **tab bar** sous 768 px (Accueil, Studio, Calendrier, Idées, Plus), **sidebar** façon iPadOS dès 1 024 px, feuilles qui montent du bas sur mobile, confirmations de suppression en ActionSheet.

- **Thèmes** : Jour, Nuit ou Automatique (défaut, suit le système). Bouton soleil / lune dans la barre de navigation, ou Paramètres > Préférences > Apparence. Le choix est propre à chaque appareil. L'aperçu des réseaux a son propre interrupteur clair / sombre.
- **Contraste** : `npm run test` vérifie chaque paire texte / fond des deux thèmes (4,5:1 pour le texte, 3:1 pour les icônes).

### Utiliser l'app sur iPhone

- `localhost` sur l'ordinateur n'est pas accessible depuis le téléphone.
- Le service worker, l'installation sur l'écran d'accueil et les notifications exigent **HTTPS** (sauf sur `localhost`).
- Les données IndexedDB sont **propres à chaque appareil et à chaque navigateur**. Sans synchronisation, le téléphone et l'ordinateur n'ont pas les mêmes données ; l'export / import JSON (Gestion des données) permet un transfert manuel.

Par ordre de simplicité :

1. **Tester l'interface** sur iPhone, sur le même réseau Wi-Fi :

   ```bash
   npx next dev --experimental-https -H 0.0.0.0
   ```

   Ouvrir `https://<adresse IP de l'ordinateur>:3000` dans Safari et accepter le certificat. Suffisant pour juger le design, pas pour un usage quotidien.

2. **Usage réel sur téléphone** : déploiement privé (par exemple Vercel) protégé par une authentification, avec la synchronisation Supabase. Hors périmètre de cette version ; l'architecture ne l'empêche pas.

**Installer sur l'écran d'accueil** : dans Safari, Partager, puis « Sur l'écran d'accueil ». L'application s'ouvre alors en plein écran. Le service worker (`public/sw.js`, actif en production seulement) garde l'interface en cache pour un démarrage hors ligne ; les routes `/api/*` ne sont jamais mises en cache.

## Structure du projet

```
app/
  (workspace)/          Écrans : dashboard (/), studio, library, fighters, events, hashtags,
                        editorial, history, validated, settings/[section]
  api/                  Routes serveur : generate, refine, decline, ai/test, ai/status,
                        storage/snapshot, storage/restore
components/             Un dossier par écran (studio, library, events…), ui/ pour les primitives
hooks/                  Accès aux données (useRepository + useLiveQuery), raccourcis, Studio
stores/                 États d'interface (Zustand) : studio, bibliothèque, shell, notifications
lib/                    Logique métier pure, sans React
  categories/           Registre des 38 catégories et de leurs champs
  database/             Dexie, DataRepository, instantanés, seed, synchro fichier
  editorial/            Règles, linter, extracteur de style, profils
  retrieval/            Index BM25, score, recherche des références
  generation/           Moteur natif (native/), Fact Guard, anti-copie, orchestrateur
  ai/                   Couche IA serveur : adaptateurs, prompts, clés, routes
  import/ library/      Imports, classifieur, doublons, requête de la bibliothèque
  fighters/ events/ hashtags/ history/ data/ …   Logique de chaque écran
types/domain.ts         Schémas Zod du domaine (source de vérité des types)
tests/unit/             Vitest     tests/e2e/   Playwright (scenarios/ : recette)
data/                   Sauvegarde locale (ignorée par git)
```

## Base locale : IndexedDB et dossier `data/`

- **IndexedDB** (Dexie, base `hexagone-social-studio`) est la base de travail : bibliothèque, fiches, générations et révisions, sessions, profils de style, réglages. Toute écriture passe par `DataRepository` (`lib/database/repository.ts`) et est validée par les schémas Zod.
- **Fichier `data/hexagone-studio.json`** : après chaque écriture (avec un court délai), l'application envoie un instantané complet à la route locale `/api/storage/snapshot`, qui l'écrit sur le disque. Une copie datée est gardée régulièrement dans `data/backups/`. L'indicateur « Sauvegardé · il y a 3 s » du header suit cet état.
- **Au démarrage**, si IndexedDB est vide (autre navigateur, données effacées) et que le fichier existe, l'application propose de le restaurer. « Ignorer » démarre avec les exemples fictifs et garde une copie du fichier dans `data/backups/`.
- Le brouillon du Studio (brief en cours) est aussi gardé dans le `localStorage` du navigateur.
- Variables : `FILE_SYNC_ENABLED` (désactive la copie fichier), `STORAGE_DIR`, `STORAGE_MAX_BYTES`, `STORAGE_BACKUP_INTERVAL_MS`.
- Aucune clé API n'est jamais écrite dans IndexedDB, le `localStorage`, le fichier ou un export : la route refuse tout instantané qui contient un champ de type clé, jeton ou secret.

## Sauvegarde et restauration

Tout se fait dans **Paramètres > Gestion des données** (`/settings/data`) :

| Action               | Détail                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Export JSON intégral | Toutes les tables et `schemaVersion`, jamais de clé API. Se réimporte tel quel.                          |
| Bibliothèque en CSV  | UTF-8 avec BOM (accents et emojis corrects dans Excel), séparateur `;`, colonnes de l'import CSV.        |
| Excel                | Une feuille par table, plus les réglages.                                                                |
| Import JSON          | Aperçu des volumes. « Fusionner » (défaut, doublons ignorés) ou « Remplacer » (deux confirmations).      |
| Restaurer            | Depuis `data/hexagone-studio.json` ou une sauvegarde de `data/backups/`.                                 |
| Exemples fictifs     | Suppression des six publications de démonstration.                                                       |
| Réinitialiser        | Trois confirmations, export JSON téléchargé automatiquement avant, retour à l'état du premier lancement. |

Avant tout remplacement, l'état courant est copié dans `data/backups/` ; si la copie fichier est désactivée, un export JSON est téléchargé à la place.

## Importer des wordings

La **Bibliothèque** (`/library`) propose trois imports. Tous passent par l'étape **Vérifier** (catégorie et mode proposés, plateforme, doublons, actions groupées, fusion et scission de lignes) puis **Confirmer** (« Importer N publications »).

- **Collage en masse** : les publications à la suite, séparées par une ligne qui ne contient que `===` (règle exacte : `/^\s*={3,}\s*$/m`). Compteur en direct.
- **CSV ou Excel (`.xlsx`)** : colonnes reconnues sans tenir compte de la casse ni des accents : `texte` (requise), `mode`, `categorie`, `combattants` (séparés par `;`), `evenement`, `date`, `reseau`, `lien`, `hashtags`, `cta`, `tags`, `commentaire`. Un écran de correspondance s'affiche si un en-tête n'est pas reconnu. Le modèle CSV se télécharge depuis la modale ; l'export CSV de la bibliothèque se réimporte tel quel.
- **Instagram** : légende collée avec son lien (stocké, jamais consulté), ou fichier `posts_1.json` de l'export Meta « Télécharger vos informations » au format JSON. L'encodage cassé des exports Meta est corrigé, les emojis sont restaurés, un aperçu s'affiche avant l'import. Aucun appel n'est fait à Instagram ; la connexion à l'API officielle est décrite dans `lib/import/instagram-api.README.md` (non implémentée).

**Classifieur** (`lib/import/classifier.ts`) : mots-clés et emojis pondérés par catégorie ; à partir de 30 publications réelles catégorisées, les 5 plus proches voisines (BM25) votent aussi. Sous 0,4 de confiance, la ligne est marquée « À catégoriser ». **Doublons** : exact par empreinte du texte normalisé, proche au-delà de 85 % de suites de trois mots communes, dans le lot et contre la bibliothèque. Les doublons sont ignorés par défaut ; « Remplacer » demande une confirmation.

Au-delà de 10 publications importées, le profil de style du mode est recalculé et proposé ; un administrateur le valide dans **ADN éditorial**.

## Moteur natif : fonctionnement et limites

Le moteur natif (`lib/generation/native/`) est un moteur de **composition**, pas une IA.

1. **Contexte** (`context.ts`) : le brief, la Session Live, les fiches combattant et événement deviennent des variables (`{winner}`, `{eventLabel}`, `{dateLabel}`…) et une liste de **faits autorisés**. Une variable n'existe que si sa source est renseignée.
2. **Modèles** (`templates/`) : chaque catégorie fournit des banques de formulations (accroches, corps, contexte, histoire). La fabrique en tire 3 modèles par variante, aux structures différentes : **Signature HEXAGONE** (accroche, corps, information, CTA, signature, hashtags), **Punchy** (court, sans CTA) et **Storytelling** (angle, plusieurs paragraphes).
3. **Composition** (`composer.ts`) : un segment dont une variable manque est supprimé, jamais complété. Les formulations sont choisies par une graine stable : même brief, même résultat ; « Générer » à nouveau change de formulations.
4. **Sélection** (`engine.ts`) : chaque candidat est noté selon la proximité avec les accroches récentes (anti-répétition), les expressions surutilisées du profil, la longueur cible du profil validé et les patrons d'accroche fréquents.
5. **Contrôles** : linter éditorial (« de HEXAGONE MMA », espaces insécables, emojis, règle Samba Sima…), Fact Guard (tout nombre, date, horaire, nom propre ou diffuseur absent des faits est signalé) et anti-copie (une référence n'est jamais recopiée).
6. **Retouches** : raccourcir, plus percutant, plus institutionnel, nouvelle accroche, emojis, reformuler… Chaque retouche ajoute une révision.

**Limites** :

- Il ne rédige qu'avec les formulations de ses modèles : il ne crée pas de phrase nouvelle et ne reformule pas librement.
- La « consigne particulière » d'une retouche exige un fournisseur IA (le bouton est désactivé et expliqué en natif).
- Une information absente du brief ou des fiches n'apparaît jamais : un brief maigre donne un texte court.
- Le style appris (longueurs, emojis, accroches, hashtags) n'est appliqué qu'après validation du profil par un administrateur.

## Clés API : `.env.local` et clé de session

Le moteur natif fonctionne sans clé. Pour rédiger avec Claude ou OpenAI :

1. **`.env.local` (recommandé)** :

```bash
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5-5
```

Pour OpenAI : `OPENAI_API_KEY` et `OPENAI_MODEL` (aucun modèle par défaut). `AI_PROVIDER` fixe le moteur choisi au premier lancement (`native`, `anthropic`, `openai`), `AI_TIMEOUT_MS` le délai maximal d'un appel (30 s par défaut).

2. **Clé de session**, en développement : coller la clé dans **Paramètres > Intelligence artificielle** (`/settings/ai`). Elle reste dans le `sessionStorage` de l'onglet, part vers la route locale dans l'en-tête `x-hex-provider-key` et n'est jamais enregistrée. En production, cette saisie est désactivée, sauf `ALLOW_CLIENT_KEYS=true`.

3. Choisir le moteur dans le même écran, puis **Tester la connexion** : vrai appel au fournisseur, avec la latence et le modèle, ou l'erreur exacte (par exemple « clé refusée par le fournisseur (401) »).

Les appels passent uniquement par les routes serveur. En cas d'échec (clé absente ou refusée, quota, délai, réponse illisible), le moteur natif prend le relais avec le message « Génération IA indisponible (motif). Propositions produites par le moteur natif. ». Les sorties IA passent par le même linter, Fact Guard et anti-copie. Après un build, `npm run check:bundle` vérifie qu'aucune clé, aucun SDK ni hôte de fournisseur n'est dans le code envoyé au navigateur.

## Ajouter un fournisseur IA

1. Écrire un pilote dans `lib/ai/adapters/<nom>.ts` qui implémente `ProviderDriver` (`lib/ai/types.ts`) : `complete()` (sortie structurée validée par les schémas de `lib/ai/schema.ts`) et `ping()` (vrai appel léger pour « Tester la connexion »). Traduire les erreurs avec `lib/ai/errors.ts`.
2. L'ajouter à `DRIVERS` dans `lib/ai/registry.ts`.
3. Ajouter son identifiant à `EngineSchema` (`types/domain.ts`), ses variables d'environnement à `ENV_NAMES` (`lib/ai/keys.ts`) et à `.env.example`, et son libellé à `lib/ai/indicator.ts`.
4. Ajouter son hôte et son SDK à la liste de `scripts/check-bundle.mjs`.
5. Tests : `tests/unit/ai/routes.test.ts` montre comment simuler un fournisseur au niveau HTTP.

Le SDK n'est importé que par le pilote, qui n'est chargé que par les routes serveur.

## Ajouter une catégorie ou un modèle natif

1. **Catégorie** : une entrée dans `lib/categories/live.ts` ou `lib/categories/daily.ts` : identifiant, mode, groupe (DAILY) ou famille (LIVE), libellé, emoji, champs requis et optionnels, préréglages, consigne de ton, signature par défaut, raccourci clavier (LIVE). Un champ nouveau se déclare dans `lib/categories/fields.ts` ; le formulaire du Studio se génère seul.
2. **Modèles natifs** : une entrée `CategoryCopy` dans `lib/generation/native/templates/live.ts`, `daily.ts` ou `media.ts` (banques d'accroches par variante, corps, contexte, histoire). La fabrique produit les 3 modèles par variante. Règles : aucun nombre, nom, date ni diffuseur écrit en dur (tout passe par une variable), pas d'accord de genre.
3. **Classifieur** (facultatif) : des mots-clés et emojis pour la catégorie dans `RULES` (`lib/import/classifier.ts`).
4. Mettre à jour le décompte des catégories dans `tests/unit/categories/registry.test.ts`, puis lancer `npm run test` : le test de propriété du moteur (200 briefs aléatoires, aucune invention) et le catalogue (3 modèles par variante, structures distinctes) doivent rester verts.

## Recherche des références

Avant chaque génération, le Studio choisit dans la bibliothèque 5 à 10 publications réelles qui servent de références de style.

1. **Filtre dur** : même mode que le brief (une référence LIVE ne sert jamais en DAILY, et inversement), publications marquées « référence de style », exemples fictifs exclus sauf option explicite, références écartées par le CM retirées.
2. **Score pondéré** (`lib/retrieval/scorer.ts`), poids modifiables dans les réglages :

   | Composante          | Poids | Valeur                                                                |
   | ------------------- | ----- | --------------------------------------------------------------------- |
   | Même catégorie      | 0,30  | 1, ou 0,5 si catégorie voisine (même groupe DAILY, même famille LIVE) |
   | Combattants         | 0,20  | part des combattants du brief présents (fiche liée ou nom cité)       |
   | Même événement      | 0,10  | fiche liée ou nom de l'événement cité                                 |
   | Similarité du texte | 0,25  | BM25 entre le brief et le post, normalisé sur le meilleur             |
   | Même plateforme     | 0,10  | 1 ou 0                                                                |
   | Fraîcheur           | 0,05  | exp(-âge en jours / 365)                                              |
   | Déjà utilisée       | -0,15 | référence d'une des 5 dernières générations                           |

3. **Diversité** : au plus 3 références de même structure (H-B-C-T...). Au-delà des 5 premières, une référence doit atteindre 40 % du meilleur score.

L'index BM25 (`lib/retrieval/index.ts`) vit en mémoire. Il est construit au chargement, puis mis à jour publication par publication à chaque écriture, y compris depuis un autre onglet (`connectRetriever`, `lib/retrieval/service.ts`).

## Évolution : Supabase et pgvector

Rien de cela n'est implémenté en v1 ; l'architecture le prépare.

**Supabase** : un `SupabaseRepository` implémenterait le même contrat `DataRepository` que `DexieRepository`, pour la synchro entre postes, de vrais comptes et le contrôle des rôles côté serveur (RLS). Le reste de l'application ne change pas. Le détail (correspondance des tables, sécurité, migration depuis le fichier local) est dans [`lib/database/supabase.README.md`](./lib/database/supabase.README.md).

**pgvector** (`PgVectorRetriever`) : le contrat `Retriever` (`lib/retrieval/retriever.ts`) permet d'ajouter un second moteur sans toucher au Studio :

- **Stockage** : colonne `embedding vector(n)` sur la table `wordings` de Supabase (voir `lib/database/supabase.README.md`), index HNSW.
- **Calcul des embeddings** : côté serveur uniquement, dans une route Next.js, avec la clé du fournisseur gardée dans `.env.local` (règle 1.5). Recalcul à chaque modification du texte.
- **Requête** : même filtre dur en SQL (`mode`, `is_reference`, `is_demo`), puis recherche des plus proches voisins sur l'embedding du brief.
- **Score** : la similarité cosinus remplace ou complète la composante « similarité du texte » ; les autres composantes, la diversité et les limites restent identiques.
- **Repli** : si Supabase ou le fournisseur d'embeddings est indisponible, `LocalBm25Retriever` prend le relais.

## Tests

```bash
npm run test
```

```bash
npm run test:e2e
```

```bash
npm run test:scenarios
```

- **Unitaires** (Vitest, `tests/unit`) : linter, coupures, compteur X, séparateur `===`, classifieur, doublons, extracteur de style, recherche des références, moteur natif (structures distinctes, aucune invention, anti-répétition), Fact Guard, anti-copie, signatures, aller-retour export / import, masquage des clés dans les journaux, et la logique de chaque écran.
- **E2E** (Playwright, `tests/e2e`) : le serveur de développement démarre seul sur le port 3100 avec un dossier de sauvegarde dédié (`.e2e-data`). `tests/e2e/scenarios/` contient les 15 scénarios de recette, un fichier par scénario ; `annexe-b-termine.spec.ts` rejoue la définition du « terminé » (50 posts collés, analyse par mode, propositions sans copie, travail retrouvé dans un autre navigateur).
- Chromium est préinstallé dans l'environnement de développement ; ailleurs : `npx playwright install chromium`.

## Raccourcis clavier

| Raccourci                      | Action                                                  |
| ------------------------------ | ------------------------------------------------------- |
| `Alt+L` / `Alt+D`              | Passer en LIVE SHOW / en DAILY & MEDIA                  |
| `Ctrl+K` (`Cmd+K` sur Mac)     | Palette : actions, wordings, combattants, événements    |
| `1` à `9`, `0`, `-`, `=`       | Catégories LIVE (hors d'un champ)                       |
| `Ctrl+Entrée`                  | Générer, même depuis un champ                           |
| `Ctrl+Maj+C` (ou `Ctrl+Alt+C`) | Copier la variante affichée (réglable dans Préférences) |
| `Alt+1` / `Alt+2` / `Alt+3`    | Afficher la variante 1, 2 ou 3 dans l'aperçu            |
| `?`                            | Tous les raccourcis du Studio                           |
| `Tab` au chargement            | Lien « Aller au contenu »                               |
