# HEXAGONE MMA · Social Studio

> Your voice. Your fight. Your content.

Outil interne de production éditoriale pour les Community Managers de HEXAGONE MMA. Il rédige des publications Instagram, Facebook, X et TikTok à partir d'une mémoire éditoriale : les anciens posts réellement publiés.

Le projet est construit par phases. Le cahier des charges complet est dans [`PROMPT.md`](./PROMPT.md), l'avancement dans [`PROGRESS.md`](./PROGRESS.md). Ce README sera complété en Phase 12.

## Prérequis

- Node.js 22 ou plus récent
- npm 10

## Installation

```bash
npm install
```

```bash
cp .env.example .env.local
```

Sans clé API, l'application fonctionne avec le moteur natif. Les clés éventuelles vont uniquement dans `.env.local`, jamais dans le code.

## Lancement

```bash
npm run dev
```

L'application tourne sur http://localhost:3000.

## Scripts

| Script                            | Rôle                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                     | Serveur de développement                                                              |
| `npm run build` / `npm run start` | Build et serveur de production                                                        |
| `npm run typecheck`               | Génère les types de routes Next puis lance `tsc --noEmit`                             |
| `npm run lint`                    | ESLint sur tout le projet                                                             |
| `npm run format`                  | Prettier (avec tri des classes Tailwind)                                              |
| `npm run test`                    | Tests unitaires Vitest (`tests/unit`)                                                 |
| `npm run test:e2e`                | Tests Playwright (`tests/e2e`), serveur de dev lancé automatiquement sur le port 3100 |
| `npm run check:bundle`            | Après un build : vérifie qu'aucune clé ni SDK IA n'est dans le bundle client          |

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Radix UI (composants shadcn/ui copiés dans `components/ui`), Zustand, Dexie (IndexedDB), Zod, papaparse, exceljs, twitter-text, jsdiff, SDK Anthropic et OpenAI, Vitest, Playwright.

## Raccourcis clavier

| Raccourci                  | Action                                               |
| -------------------------- | ---------------------------------------------------- |
| `Alt+L` / `Alt+D`          | Passer en LIVE SHOW / en DAILY & MEDIA               |
| `Ctrl+K` (`Cmd+K` sur Mac) | Palette : actions, wordings, combattants, événements |
| `Tab` au chargement        | Lien « Aller au contenu »                            |

## Bibliothèque et imports (Phase 9)

La bibliothèque (`/library`) rassemble les publications réelles de HEXAGONE MMA. Elle nourrit l'ADN éditorial et la recherche de références.

- **Recherche** : mots-clés classés par BM25, ou expression exacte entre guillemets (`"premier round"` ou `« premier round »`). Filtres par mode, catégorie, combattant, événement, dates, plateforme, tag, statut, source. Les exemples fictifs sont masqués par défaut.
- **Affichage** : liste dense ou grille, choix mémorisé. Seules les lignes visibles sont rendues : la page reste fluide à 5 000 publications.
- **Fiche** : seul le texte est à saisir. La catégorie est proposée par le classifieur, les hashtags et l'appel à l'action sont extraits du texte. Un doublon exact bloque l'enregistrement ; une publication très proche demande une confirmation.

Trois façons d'importer, qui passent toutes par les étapes « Vérifier » puis « Confirmer » :

| Import                 | Format                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collage en masse       | Publications séparées par une ligne qui ne contient que `===`                                                                                                                                                  |
| CSV ou Excel (`.xlsx`) | Colonnes `texte` (requise), `mode`, `categorie`, `combattants` (séparés par `;`), `evenement`, `date`, `reseau`, `lien`, `hashtags`, `cta`, `tags`, `commentaire`. Modèle CSV téléchargeable depuis la modale. |
| Instagram              | Légende collée avec son lien, ou fichier `posts_1.json` de l'export « Télécharger vos informations » (format JSON)                                                                                             |

Les doublons exacts sont ignorés par défaut ; « Remplacer » demande une confirmation. Aucun appel n'est fait à Instagram : seuls le texte et le fichier fournis sont lus. La connexion à l'API officielle est décrite dans `lib/import/instagram-api.README.md` (non implémentée).

## Combattants, événements, hashtags et signatures (Phase 10)

- **Combattants** (`/fighters`) : fiche complète, palmarès toujours daté, historique de combats en tableau, publications et événements liés. Une fiche non mise à jour depuis 90 jours porte « À vérifier ». Le palmarès n'est utilisé dans un texte que si « Utiliser le palmarès » est coché dans le brief.
- **Événements** (`/events`) : à venir puis passés, fight card construite par glisser-déposer (ou au clavier), diffuseurs avec horaires et case « Horaires confirmés ». Sans confirmation, aucun horaire n'apparaît dans les textes ni dans les signatures. Bouton « Démarrer la Session Live pour cet événement ».
- **Dans le Studio** : choisir un événement de la base dans le brief remplit la date, la salle, la ville et le lien billetterie de la catégorie. Une valeur saisie à la main n'est jamais écrasée.
- **Hashtags & signatures** (`/hashtags`) : groupes (le `#` est ajouté et les espaces retirés à la saisie), ordre, modes, état par défaut ; signatures avec variables `{date}`, `{venue}`, `{city}`, `{broadcaster}`, `{prelimsTime}`, `{prelimsChannel}`, `{mainTime}`, `{mainChannel}`, `{ticketLink}`, champs requis et aperçu rendu avec un événement. Une ligne dont une variable est vide n'est pas affichée.

## Moteurs IA : Claude et OpenAI (Phase 6)

Le moteur natif fonctionne sans clé. Pour rédiger avec Claude ou OpenAI :

1. Renseigner la clé dans `.env.local` (recommandé) :

```bash
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5-5
```

Pour OpenAI, `OPENAI_API_KEY` et `OPENAI_MODEL` (aucun modèle par défaut). `AI_PROVIDER` fixe le moteur choisi au premier lancement, `AI_TIMEOUT_MS` le délai maximal d'un appel (30 s par défaut).

2. Ou, en développement, coller la clé dans **Paramètres > Intelligence artificielle** (`/settings/ai`). Elle reste dans `sessionStorage` (l'onglet courant), part vers la route locale dans l'en-tête `x-hex-provider-key` et n'est jamais enregistrée. En production, cette saisie est désactivée sauf `ALLOW_CLIENT_KEYS=true`.

3. Choisir le moteur dans le même écran, puis **Tester la connexion** : vrai appel au fournisseur, latence et modèle, ou l'erreur exacte.

Les appels passent uniquement par les routes serveur (`/api/generate`, `/api/refine`, `/api/decline`, `/api/ai/test`). En cas d'échec (clé refusée, quota, délai, réponse illisible), le moteur natif prend le relais avec le message « Génération IA indisponible (motif). Propositions produites par le moteur natif. ». Les sorties IA passent par le même linter, Fact Guard et anti-copie que le moteur natif : une information absente du brief est surlignée.

Ajouter un fournisseur : un pilote dans `lib/ai/adapters/`, une ligne dans `lib/ai/registry.ts`, son identifiant dans `EngineSchema` (`types/domain.ts`).

## Recherche des références (Phase 4)

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

### Évolution : recherche sémantique (`PgVectorRetriever`)

Non implémentée en v1. Le contrat `Retriever` (`lib/retrieval/retriever.ts`) permet d'ajouter un second moteur sans toucher au Studio :

- **Stockage** : colonne `embedding vector(n)` sur la table `wordings` de Supabase (voir `lib/database/supabase.README.md`), index HNSW.
- **Calcul des embeddings** : côté serveur uniquement, dans une route Next.js, avec la clé du fournisseur gardée dans `.env.local` (règle 1.5). Recalcul à chaque modification du texte.
- **Requête** : même filtre dur en SQL (`mode`, `is_reference`, `is_demo`), puis recherche des plus proches voisins sur l'embedding du brief.
- **Score** : la similarité cosinus remplace ou complète la composante « similarité du texte » ; les autres composantes, la diversité et les limites restent identiques.
- **Repli** : si Supabase ou le fournisseur d'embeddings est indisponible, `LocalBm25Retriever` prend le relais.
