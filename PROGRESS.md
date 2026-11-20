# PROGRESS : HEXAGONE MMA SOCIAL STUDIO

Journal d'avancement. Chaque phase liste ce qui a été livré, les décisions prises et les écarts par rapport à `PROMPT.md`.

| Phase | Intitulé                                        | Statut   |
| ----- | ----------------------------------------------- | -------- |
| 0     | Setup du projet                                 | Terminée |
| 1     | Schéma de données, persistance, exemples        | Terminée |
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

**Prochaine étape : Phase 2.**

---

## Phase 1 : Schéma de données, persistance et exemples (terminée le 20/11/2026)

### Livré

- **Types de domaine** (`types/domain.ts`) : un schéma Zod par entité de la section 6.1 (Wording, Fighter, HexEvent, LiveSession, Brief, Variant, Revision, Generation, HashtagGroup, Signature, EditorialRule, StyleProfile complet selon 8.3, UserProfile, Settings), types dérivés par `z.infer`. `SettingsSchema.parse({})` donne une configuration complète (options rapides, seuils de coupure, poids de recherche...).
- **Utilitaires texte** (`lib/editorial/text-utils.ts`) : normalisation (minuscules, sans accents, sans emojis, apostrophes unifiées, espaces compactés), extraction des hashtags et des emojis (séquences ZWJ, drapeaux, touches et teintes comptés comme un seul emoji). La Phase 3 complètera ce module.
- **Fabrique de wordings** (`wording-factory.ts`) : calcule `textNormalized`, `contentHash` (SHA-256 via Web Crypto), emojis et hashtags.
- **Base Dexie** (`db.ts`) : les 12 tables de la section 6.2.
- **Repository** : interface `DataRepository` (`repository.ts`) et `DexieRepository`. Par entité : `list` (index, tri, pagination, filtre), `get`, `put` et `bulkPut` validés par Zod, `delete`, `search` (chaque mot doit être présent, sans accents ni casse), `count`. Plus : méta et réglages, `isEmpty`, `transaction`, `exportAll`, `importAll(snapshot, "merge" | "replace")`, notifications de changement.
- **Instantanés et migrations** (`snapshot.ts`, `migrations.ts`) : format JSON versionné (`schemaVersion`), migration pas à pas puis validation, messages d'erreur lisibles. v1 sans migration.
- **Données initiales** (`seed.ts`) : 6 wordings fictifs (KO court, nouveau champion, réaction ; annonce de combat, relais presse, billetterie), groupes de hashtags (seul `#HexagoneMMA` actif par défaut), les deux signatures, 13 règles éditoriales, fiche Samba Sima (nom et règle uniquement), utilisateur « Community Manager » admin, réglages par défaut. Exécution unique, sûre si deux onglets démarrent en même temps.
- **Synchro fichier** : `FileSyncService` (debounce 2 s, une écriture à la fois, désactivation propre), stockage serveur `file-store.server.ts` (écriture atomique, fiche résumé, rotation des 10 dernières sauvegardes), routes `POST /api/storage/snapshot` et `GET /api/storage/restore` (résumé, instantané complet, liste et lecture des sauvegardes).
- **Démarrage côté navigateur** (`components/data/DataBootstrap.tsx`, `lib/database/bootstrap.ts`) : base non vide → prête ; base vide et fichier trouvé → modale « Une sauvegarde locale du JJ/MM/AAAA HH:MM a été trouvée (N wordings). Restaurer ? » ; sinon seed. Bandeau d'erreur si IndexedDB est indisponible.
- Composants `components/ui/button.tsx` et `components/ui/alert-dialog.tsx` (shadcn adapté), store Zustand `stores/data.store.ts` (phase de démarrage, état de la synchro pour le futur header).
- `lib/database/supabase.README.md` : mapping des tables pour un futur `SupabaseRepository`.

### Validation

- `typecheck`, `lint`, `format:check` : OK. `build` : OK, sans avertissement.
- `npm run test` : 104 tests. Couvrent notamment `put/get/delete` sur chacune des 11 entités, le round-trip export → JSON → import → export identique, la fusion sans doublon, le remplacement avec sauvegarde obligatoire, la migration v1 d'un instantané vide, le seed, la route snapshot (fichier principal + sauvegarde créés, aucun champ `apiKey`, `key` ou `token`), la route restore, la synchro et le démarrage.
- `npm run test:e2e` : 4 scénarios. Persistance après actualisation (y compris une publication ajoutée hors de l'application), fichier local à jour, modale de restauration (Échap ne la ferme pas), « Restaurer » et « Ignorer ».

### Décisions et écarts

1. **Pas d'index IndexedDB sur les booléens.** IndexedDB n'accepte pas `true`/`false` comme clé : un index sur `isDemo`, `isReference` ou `active` resterait vide et `where("isDemo")` ne renverrait rien, sans erreur. Ces trois champs sont retirés des index (`DEXIE_SCHEMA_V1`) et filtrés en mémoire via `list({ filter })`. Le reste du schéma 6.2 est conforme.
2. **Méta exportées sous forme d'objet.** La table `meta` de Dexie a pour clé `key`. Dans les instantanés, les méta deviennent un objet `{ seedVersion, lastBackupAt, settings }` : aucun fichier ne contient de champ nommé `key`, conformément au critère de validation.
3. **Champs interdits refusés, pas filtrés.** La route snapshot rejette (422) tout instantané contenant un champ `apiKey`, `key`, `token`, `secret`, `password` ou `authorization`, à toute profondeur. Les schémas Zod retirent en plus tout champ inconnu à l'enregistrement.
4. **Sauvegardes horodatées espacées.** Avec un envoi toutes les 2 s, garder une sauvegarde par écriture ne couvrirait que les 20 dernières secondes. Une sauvegarde automatique est créée au plus toutes les 5 minutes (`STORAGE_BACKUP_INTERVAL_MS`), et systématiquement pour une raison explicite (`manual`, `pre-replace`). Les 10 plus récentes sont gardées.
5. **Protection contre l'écrasement.** Si un nouvel instantané contient moins de wordings que le fichier en place, l'ancien fichier est copié dans `backups/` avant d'être remplacé. « Ignorer » dans la modale renvoie aussi le fichier existant au serveur avec la raison `manual` : la copie est garantie avant le seed.
6. **Erreurs réseau tolérées.** Toute réponse d'erreur de la route désactive la synchro (section 3.2). Une coupure réseau (serveur de dev qui redémarre) passe en état « erreur » et ne désactive qu'après 3 échecs consécutifs.
7. **Images en base64.** La table `blobs` stocke les images (logo, visuel d'aperçu) en base64 et non en objet `Blob`, pour que les sauvegardes JSON restent complètes et relisibles.
8. **Ajouts aux schémas** : `Signature.requiresConfirmedSchedule` (signature « Diffusion détaillée »), `EditorialRule.description / flags / values` (listes éditables : formules d'IA, qualificatifs Samba Sima, catégories sans question finale), `order` sur les groupes de hashtags et les signatures (réordonnables, section 15.3), `StyleProfile.includesDemo`, action de révision `restore` (retour à une révision antérieure), valeur de brief en liste (sélections multiples). Les identifiants ne sont pas contraints au format UUID : les données initiales ont des identifiants fixes, ce qui rend le seed idempotent.
9. **Démos sans combattant lié.** Les noms fictifs (Yanis Fictif, Hugo Démo, Nina Exemple...) n'apparaissent que dans les textes. Aucune fiche combattant fictive n'est créée, pour ne pas polluer la base réelle.
10. **Variables d'environnement optionnelles** ajoutées à `.env.example` (commentées) : `STORAGE_DIR`, `STORAGE_MAX_BYTES`, `STORAGE_BACKUP_INTERVAL_MS`. Les tests e2e écrivent dans `.e2e-data/` (ignoré par git), jamais dans `data/`.
11. **Playwright en série** (`workers: 1`) : les scénarios partagent le dossier de sauvegarde du serveur.
12. **Avertissement Turbopack corrigé** : le chemin du dossier `data` est calculé à l'exécution, annoté `turbopackIgnore` pour éviter le traçage de tout le projet au build.
13. **Écriture des échappements Unicode.** L'outil d'écriture de fichiers convertit les séquences `\u…` en caractères bruts. Les expressions concernées passent par `new RegExp("...\\u…")` et les tests par `String.fromCodePoint`, pour garder un code source lisible.

### Fichiers créés ou modifiés

`types/domain.ts`, `types/index.ts`, `lib/editorial/text-utils.ts`, `lib/format.ts`, `lib/database/{db,repository,dexie-repository,snapshot,migrations,seed,hash,wording-factory,file-sync,file-store.server,client,bootstrap}.ts`, `lib/database/supabase.README.md`, `app/api/storage/snapshot/route.ts`, `app/api/storage/restore/route.ts`, `app/layout.tsx`, `components/data/{DataBootstrap,RestoreBackupDialog}.tsx`, `components/ui/{button,alert-dialog}.tsx`, `stores/data.store.ts`, `tests/setup.ts`, `tests/fixtures/entities.ts`, `tests/unit/text-utils.test.ts`, `tests/unit/database/*.test.ts` (7 fichiers), `tests/e2e/phase1-persistence.spec.ts`, `playwright.config.ts`, `.env.example`, `.gitignore`.

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
