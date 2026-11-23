# PROGRESS : HEXAGONE MMA SOCIAL STUDIO

Journal d'avancement. Chaque phase liste ce qui a été livré, les décisions prises et les écarts par rapport à `PROMPT.md`.

| Phase | Intitulé                                        | Statut   |
| ----- | ----------------------------------------------- | -------- |
| 0     | Setup du projet                                 | Terminée |
| 1     | Schéma de données, persistance, exemples        | Terminée |
| 2     | Catégories, règles éditoriales, linter          | Terminée |
| 3     | Intelligence éditoriale (Brand Voice Extractor) | Terminée |
| 4     | Recherche des références                        | Terminée |
| 5     | Moteur natif                                    | Terminée |
| 6     | Moteur IA (Anthropic / OpenAI)                  | Terminée |
| 7     | Shell de l'application                          | Terminée |
| 8     | Social Studio                                   | Terminée |
| 9     | Bibliothèque                                    | À faire  |
| 10    | Combattants, événements, hashtags, signatures   | À faire  |
| 11    | Historique, dashboard, paramètres, données      | À faire  |
| 12    | Tests, QA, README                               | À faire  |

**Prochaine étape : Phase 9.**

---

## Phase 8 : Le Social Studio (terminée le 23/11/2026)

### Livré

- **Page `/studio`** (`?mode=live|daily` ouvre le Studio dans ce mode), entrées Social Studio, LIVE SHOW et DAILY & MEDIA actives dans la navigation.
- **Mise en page** (`StudioLayout`) : à partir de 1 280 px, trois colonnes 32 / 40 / 28 dont chacune défile seule, en-têtes collants, hauteur ajustée au header et à la barre Session Live (`--session-bar`). De 1 024 à 1 279 px, l'aperçu devient un panneau escamotable à droite. Sous 1 024 px, trois onglets « 1. Saisie · 2. Résultats · 3. Aperçu », pastille sur Résultats, bascule automatique après Générer, bouton Générer collant de 52 px.
- **Colonne Brief** (`BriefColumn`, `components/forms/`) : plateforme principale mémorisée par mode ; catégories LIVE en grille avec raccourcis `1` à `=`, DAILY en quatre groupes repliables avec filtre ; formulaire généré depuis le registre (combattant avec recherche floue, fight card de l'événement en premier, « Utiliser “Xxx” » ou « Créer la fiche » ; puces rapides ; temps `m:ss` ; bascule du vainqueur ; liste, date, lien, événement, case à cocher) ; champs requis marqués d'un point ; hashtags avec aperçu de ce qui sera ajouté ; signature avec « Signature incomplète : … manquantes » ; CTA du profil et saisie libre ; consigne particulière en DAILY ; Générer (`Ctrl/Cmd+Entrée`, aussi depuis un champ) ; Réinitialiser (la Session Live reste).
- **Brouillon automatique** (`stores/studio.store.ts`, `lib/studio/draft.ts`) : un brief par mode, mémorisé localement (écriture différée de 300 ms) ; les champs communs passent d'un mode à l'autre, la catégorie de chaque mode est retrouvée ; préréglages et contexte de la Session Live appliqués au choix de la catégorie.
- **Colonne Wording Studio** (`WordingColumn`, `components/editor/`) : état vide avec le parcours et les raccourcis, trois squelettes pendant la génération, bandeau de bascule si l'IA échoue. Chaque carte : type et badge « Recommandée », moteur, statut (Générée, Modifiée, Validée, Publiée), compteur de la plateforme principale (anneau X orange à 260, rouge au-delà de 280), choix de la variante de l'aperçu ; éditeur auto-dimensionné ; passages à vérifier cliquables ; avertissements éditoriaux ; corrections appliquées (repliées) ; sept retouches avec chargement propre à la carte ; consigne particulière (désactivée et expliquée en natif) ; versions v1, v2… avec retour à une version et différences mot à mot ; Copier, Garder l'accroche, Enregistrer dans la bibliothèque, Valider, et dans « … » : Marquer comme publié (date, lien), Retirer la validation.
- **Déclinaison** : « DÉCLINER SUR LES AUTRES RÉSEAUX » produit une version par plateforme non principale (IA via `/api/decline`, sinon `lib/generation/native/decline.ts`), affichée en onglets, éditable, copiable, enregistrée avec la génération. Panneau « RÉFÉRENCES UTILISÉES » sous les cartes, avec exclusion et régénération.
- **Colonne Aperçu** (`components/preview/`) : choix de la plateforme indépendant, bandeau permanent « Simulation éditoriale : le rendu réel varie selon l'appareil et l'application. », cadre téléphone de 375 px mis à l'échelle. Instagram : média 4:5 (image déposée ou choisie, stockée en base), option Reel, actions sans chiffre, légende avec hashtags et mentions en couleur, coupure « … plus » / « moins » (`lib/platforms/truncation.ts`), « Accroche visible : 98 / 125 caractères », alerte si l'accroche est coupée, réglage du seuil de 60 à 300, « Afficher uniquement la partie visible avant PLUS ». Facebook (« Voir plus » au seuil des réglages, média 1:1 ou 16:9), X (compteur pondéré, partie au-delà de 280 en rouge), TikTok (9:16, légende sur deux lignes avec « plus »). « Retour à la modification » remet le focus dans l'éditeur.
- **Raccourcis** (`useStudioShortcuts`, aide « ? ») : `Ctrl/Cmd+Entrée`, `Ctrl/Cmd+Maj+C` (ou `Ctrl/Cmd+Alt+C` selon le réglage), `Alt+1/2/3`, `1…=` hors des champs, plus ceux du shell.
- **Persistance des générations** (`lib/studio/revisions.ts`, `lib/studio/actions.ts`) : chaque Générer crée une génération `draft` ; la première édition la passe à `editing` ; toutes les versions sont gardées ; la génération affichée et son brief sont rouverts après actualisation. `Generation` reçoit `publishedAt` et `publishedUrl` (facultatifs).
- Primitives `components/ui/{segmented,textarea,toaster}.tsx`, notifications (`stores/toast.store.ts`).

### Validation

- `typecheck`, `lint`, `format:check`, `build`, `check:bundle` : OK.
- `npm run test` : 378 tests (31 fichiers), dont la coupure Instagram, Facebook, TikTok et la zone X, le brouillon (préréglages, champs communs, hashtags par défaut, signature par défaut, brief envoyé), la recherche de combattants, les révisions et les quatre statuts, la déclinaison native, et les actions branchées sur la base.
- `npm run test:e2e` : 20 scénarios OK, dont 6 nouveaux, stables sur deux passages :
  - **parcours LIVE KO en 5 interactions** (touche `2`, vainqueur, Tab, perdant, `Ctrl+Entrée`), génération native affichée en moins de 1 s (environ 200 ms) ;
  - **trois colonnes qui défilent indépendamment à 1 440 px** ;
  - **390 × 844 : onglets à la place des colonnes**, bascule sur Résultats ;
  - **l'aperçu suit l'édition à chaque frappe, la coupure respecte le seuil réglé** (60) ;
  - versions, restauration, validation, brouillon et génération conservés après actualisation ;
  - brief incomplet : message sous le champ, focus dessus, aucune génération.
- Revue visuelle à 1 440, 1 180 et 390 px.

### Décisions et écarts

1. **Brouillon dans localStorage** : le « store persistant » de la section 13.3 est un store Zustand persisté localement (aucune donnée sensible). Les générations, elles, sont dans IndexedDB et dans les sauvegardes.
2. **Éditions du CM** : le Fact Guard contrôle les sorties des moteurs ; une révision `cm_edit` n'a pas de passages surlignés (le CM écrit ce qu'il sait). Les avertissements éditoriaux s'affichent en direct ; les corrections du linter (« de HEXAGONE MMA », espaces insécables…) s'appliquent quand le CM quitte le champ, pour ne pas déplacer le curseur pendant la frappe.
3. **Corrections appliquées et références** : gardées pour la session en cours. Après actualisation, la génération et ses versions reviennent ; la ligne des corrections et le panneau des références réapparaissent à la génération suivante.
4. **Enregistrer dans la bibliothèque** : fiche courte pré-remplie (texte, date, lien), statut `validated`, source `studio`, combattants reliés. La fiche complète arrive avec la Bibliothèque (Phase 9).
5. **Créer la fiche** (combattant inconnu) : fiche minimale (prénom, nom, date de mise à jour), à compléter dans Combattants (Phase 10).
6. **Coupure Instagram** : une ligne vide compte comme une ligne, comme dans l'application. TikTok : environ deux lignes (80 caractères). Le seuil Facebook se règlera dans Préférences (Phase 11) ; le seuil Instagram se règle dans la colonne, comme demandé.
7. **Image de l'aperçu** : une seule image courante (5 Mo au plus), stockée en base et donc incluse dans les sauvegardes.
8. **Aperçu et déclinaisons** : si une version déclinée existe pour la plateforme affichée, l'aperçu la montre, avec la mention « Version déclinée ».
9. **Régénérer le même brief** : chaque clic sur Générer avec un brief identique change la graine, donc les formulations.
10. **Ajouts** : « Retirer la validation » (menu « … ») pour revenir en édition ; les CTA de billetterie ne sont pas proposés sur une défaite ou une réaction ; l'indicateur IA du header suit le résultat réel des générations.
11. **Mémoire du mode** : le brouillon par mode remplace la mémoire de la Phase 7 (`lib/shell/mode.ts` simplifié, mêmes règles).
12. **Indicateur de développement Next désactivé** (`devIndicators: false`) : il recouvrait des contrôles du Studio. Les erreurs restent affichées. Remplace l'écart 8 de la Phase 7.
13. **Parcours LIVE** : 5 interactions mesurées pour un KO, sous la limite de 6.

### Fichiers créés ou modifiés

`app/(workspace)/studio/page.tsx`, `components/studio/{StudioPage,StudioLayout,StudioContext,BriefColumn,WordingColumn,ShortcutsDialog,choose-category}`, `components/forms/{CategoryPills,DynamicForm,FieldControl,HashtagPicker,SignaturePicker,CtaPicker}.tsx`, `components/forms/fields/{FighterCombobox,MultiFighterField,QuickChips,WinnerToggle}.tsx`, `components/editor/{VariantCard,VariantEditor,CharCounter,RefineBar,RevisionTimeline,DiffDialog,VariantActions,LibraryDialog,PublishDialog,DeclinePanel}.tsx`, `components/preview/{PreviewColumn,PhoneFrame,PreviewMedia,PreviewAvatar,CaptionText,InstagramPreview,FacebookPreview,XPreview,TikTokPreview}.tsx`, `components/ui/{segmented,textarea,toaster}.tsx`, `components/layout/{AppShell,LiveSessionBar,SidebarNav}.tsx`, `lib/studio/{draft,fighter-search,revisions,actions}.ts`, `lib/platforms/{truncation,counters}.ts`, `lib/generation/native/{decline,engine}.ts`, `lib/generation/{orchestrator,context-loader}.ts`, `lib/shell/{navigation,commands,mode}.ts`, `hooks/{useStudioActions,useStudioData,useStudioShortcuts}.ts`, `stores/{studio,studio-session,toast}.store.ts`, `types/domain.ts` (`publishedAt`, `publishedUrl`), `next.config.ts`, `tests/unit/platforms/truncation.test.ts`, `tests/unit/studio/{studio-logic,actions}.test.ts`, `tests/unit/shell/shell.test.ts`, `tests/e2e/{phase7-shell,phase8-studio}.spec.ts`.

---

## Phase 7 : Shell de l'application (terminée le 23/11/2026)

### Livré

- **AppShell** (`components/layout/AppShell.tsx`, `app/(workspace)/layout.tsx`) : toutes les pages de l'espace de travail partagent le header, la barre latérale, la barre Session Live et la palette. Lien d'évitement « Aller au contenu », `main#contenu`.
- **Barre latérale** (`Sidebar`, `SidebarNav`, `lib/shell/navigation.ts`) : les quatre sections de la section 12.1, 232 px ou 56 px repliée (icônes et infobulles), état mémorisé dans localStorage. Seuls les écrans livrés sont des liens (ADN éditorial, Intelligence artificielle) ; les autres restent visibles, désactivés, avec « Bientôt » et l'infobulle « Bientôt disponible ». Sur petit écran, la même navigation s'ouvre dans un panneau depuis le header (`MobileNav`).
- **Header** de 52 px fixe : logo (image `logo` en base, sinon un hexagone sobre) et « SOCIAL STUDIO », sélecteur de mode au centre, puis recherche (`Ctrl/Cmd+K`), bibliothèque (désactivée, « Bientôt disponible »), indicateur moteur IA, indicateur de sauvegarde (« Sauvegardé · il y a 3 s »), paramètres et profil actif (nom et rôle).
- **Sélecteur de mode** (`ModeSwitcher`) : groupe radio LIVE SHOW (rouge, pastille ON AIR à pulsation lente, coupée si `prefers-reduced-motion`) / DAILY & MEDIA (or). `Alt+L` / `Alt+D` partout. Le mode met à jour `data-mode`, est enregistré dans les réglages (`lastMode`) et recopié dans localStorage.
- **Mémoire du Studio** (`lib/shell/mode.ts`, `stores/studio.store.ts`) : champs communs conservés d'un mode à l'autre (tous les champs combattant et l'événement), dernière catégorie de chaque mode retrouvée. Le Studio (Phase 8) s'y branche.
- **Session Live** (`lib/shell/live-session.ts`, `LiveSessionBar`, `LiveSessionDialog`, `LiveSessionForm`, `EndSessionDialog`) : barre sous le header en LIVE SHOW uniquement. Sans session : « Démarrer une Session Live », modale avec choix d'un événement de la base (pré-remplit tout) ou saisie rapide ; seul le nom est obligatoire. Avec session : `● ÉVÉNEMENT ACTIF · HEXAGONE MMA 12 · Paris · Diffusion : RMC SPORT`, « Modifier », « Terminer » avec confirmation (archivage par `endedAt`). Une seule session active ; elle survit à l'actualisation.
- **Palette de commandes** (`CommandSearch`, `CommandList`, `lib/shell/commands.ts`) : actions réellement disponibles (changer de mode, démarrer, modifier ou terminer la session, ouvrir un écran livré, replier la barre), puis recherche dans les wordings, combattants et événements. Un résultat ouvre une fiche en lecture seule (`RecordSheet`) : texte et badge « EXEMPLE FICTIF » pour un wording, date de mise à jour et badge « À vérifier » au-delà de 90 jours pour une fiche, et pour un événement « Démarrer une Session Live avec cet événement ».
- **Script avant affichage** (`PREPAINT_SCRIPT`) : rétablit le mode et l'état de la barre avant le premier affichage, sans flash de couleur ni saut de mise en page.
- Primitives `components/ui/{dialog,tooltip,kbd}.tsx`, utilitaires `formatRelative` et `isStale` (`lib/format.ts`), hooks `useMode`, `useSidebar`, `useShortcuts`, `useLiveSession`, `useNow`, `useAiOverview`.

### Validation

- `typecheck`, `lint`, `format:check`, `build`, `check:bundle` : OK.
- `npm run test` : 353 tests (28 fichiers), dont navigation, raccourcis, mémoire du mode, palette, formats, et la Session Live branchée sur la base (une seule active, archivage, modification, validation des champs, pré-remplissage depuis une fiche).
- `npm run test:e2e` : 14 scénarios OK, dont 5 nouveaux, stables sur trois passages :
  - **navigation complète au clavier** : lien d'évitement, ordre de tabulation du header, de la barre latérale (écrans livrés seulement) et de la Session Live, flèches dans le sélecteur de mode, lien activé à l'Entrée avec `aria-current` ;
  - **barre latérale repliable** : 232 px puis 56 px, état conservé après actualisation, infobulles une fois repliée ;
  - **mode persistant après actualisation** : `Alt+D`, actualisation, DAILY & MEDIA toujours actif avec l'accent or ;
  - Session Live : nom obligatoire, démarrage, survie à l'actualisation, modification, fin confirmée ;
  - palette `Ctrl+K` : action au clavier, recherche d'un wording, fiche avec badge d'exemple fictif, message « Aucun résultat ».
- Revue visuelle en 1 280 px et 390 px : LIVE, DAILY, barre repliée, palette, modale de session, menu mobile.

### Décisions et écarts

1. **Écrans à venir dans la navigation** : visibles, désactivés, non focalisables, annoncés « bientôt disponible » aux lecteurs d'écran. Passer `available` à `true` dans `lib/shell/navigation.ts` quand une phase livre l'écran. LIVE SHOW et DAILY & MEDIA de la barre latérale ouvriront le Studio (Phase 8) ; d'ici là, le sélecteur de mode change de mode.
2. **Sélecteur de mode écrit à la main** : le `ToggleGroup` de Radix déplace le focus aux flèches sans changer la sélection, ce qui ne respecte pas le motif ARIA d'un groupe radio. Le composant suit ce motif : un seul arrêt de tabulation, les flèches changent le mode.
3. **Mode enregistré à deux endroits** : les réglages font foi (sauvegardes, restauration) ; la copie dans localStorage sert uniquement au script avant affichage.
4. **Palette** : les résultats ouvrent une fiche en lecture seule, faute d'écrans Bibliothèque, Combattants et Événements (Phases 9 et 10) ; ces fiches ne permettent aucune modification. Recherche à partir de 2 caractères, 5 résultats par groupe.
5. **Accueil** (`/`) : déplacé dans l'espace de travail pour afficher le shell. Il n'affiche que des accès aux écrans livrés ; le Dashboard arrive en Phase 11.
6. **Indicateur moteur** : désormais dans le header, comme prévu en Phase 6. L'état du serveur (`/api/ai/status`) n'est lu qu'une fois par chargement et partagé avec l'écran IA (`useAiOverview`).
7. **Heure courante** : jamais lue pendant le pré-rendu (Next 16 avec Cache Components l'interdit) ; `useNow` renvoie `null` au premier rendu.
8. **Indicateur de développement Next** déplacé en bas à droite (`devIndicators`) : en bas à gauche, il recouvrait le bouton de repli de la barre latérale. Sans effet en production. (Désactivé en Phase 8.)
9. **Profil actif** : affiché (nom, rôle) ; le changement de profil arrive avec Paramètres > Utilisateurs (Phase 11).

### Fichiers créés ou modifiés

`app/layout.tsx` (script avant affichage), `app/(workspace)/{layout,page}.tsx` (`app/page.tsx` supprimé), `app/globals.css` (variante `sidebar-collapsed`), `next.config.ts`, `components/layout/{AppShell,Sidebar,SidebarNav,MobileNav,NavIcon,Header,Logo,ModeSwitcher,EngineIndicator,SyncIndicator,UserBadge,LiveSessionBar,LiveSessionDialog,LiveSessionForm,EndSessionDialog,CommandSearch,CommandList,RecordSheet}.tsx`, `components/ui/{dialog,tooltip,kbd}.tsx`, `components/settings/AiSettingsPage.tsx`, `components/editorial/EditorialPage.tsx`, `lib/shell/{navigation,shortcuts,mode,live-session,commands}.ts`, `lib/format.ts`, `hooks/{useMode,useSidebar,useShortcuts,useLiveSession,useNow,useAiOverview,useAiSettings}.ts`, `stores/{studio,ui}.store.ts`, `tests/unit/shell/{shell,live-session}.test.ts`, `tests/e2e/phase7-shell.spec.ts`.

---

## Phase 6 : Moteur IA avancé, Anthropic et OpenAI (terminée le 23/11/2026)

### Livré

- **Interface d'adaptateur** (`lib/ai/types.ts`) : `AIProviderAdapter` de la section 11.1 (`isConfigured`, `generate`, `refine`, `decline`, `test`). Chaque fournisseur est un pilote court (`adapters/anthropic.ts`, `adapters/openai.ts`) qui sait envoyer une requête et vérifier la connexion ; `createAdapter` (`adapter.ts`) en tire l'adaptateur complet. Le registre (`registry.ts`) les branche : ajouter un fournisseur = un fichier, une ligne, et son identifiant dans `EngineSchema`.
- **Sortie structurée native** chez les deux fournisseurs : `output_config.format` (Anthropic, SDK 1.11) et `text.format` de l'API Responses (OpenAI 7.62, avec `store: false`). Validation Zod après coup (`schema.ts`) : exactement trois variantes, une par type. JSON illisible ou incomplet : une nouvelle tentative, puis bascule.
- **Prompts** (`prompts.ts`) : prompt système et message utilisateur de la section 11.3, construits depuis le registre des catégories, les règles actives (une règle désactivée n'est plus transmise), le profil validé et les contraintes de plateforme. Balises `<faits>`, `<brief>`, `<references>` datées, `<hashtags_autorises>`, `<signature>`. Un contenu ne peut pas refermer une balise.
- **Routes serveur** : `POST /api/generate`, `/api/refine`, `/api/decline`, `/api/ai/test`, et `GET /api/ai/status` (état des fournisseurs sans aucune clé). Logique dans `lib/ai/service.ts`, testable sans serveur. Délai `AI_TIMEOUT_MS` sur tout l'appel, annulation si le CM quitte la page. Toute erreur donne `{ fallback: true, reason }` avec un motif précis (« clé refusée par le fournisseur (401) », « limite de requêtes atteinte (429) », « délai dépassé (30 s) »...).
- **Clés** (`keys.ts`) : `.env.local` d'abord, puis l'en-tête `x-hex-provider-key` si `NODE_ENV !== "production"` ou `ALLOW_CLIENT_KEYS=true`. Même règle pour le modèle (`x-hex-provider-model`) : celui du .env s'impose. `safeLog()` masque tout champ `key`, `token`, `authorization`, `secret`, `password` et toute chaîne en forme de clé ; c'est la seule voie de journalisation de la couche IA, et elle n'écrit que des métadonnées. Les journaux internes des SDK sont coupés (`logLevel: "off"`).
- **Post-traitement des sorties IA** (`lib/ai/post-process.ts`) : celui du natif (nettoyage, linter, adaptation plateforme, Fact Guard, anti-copie), précédé du retrait des hashtags non cochés. Pour l'IA, Fact Guard et anti-copie signalent sans réécrire.
- **Retouches natives** (`lib/generation/native/refine.ts`, `text-refine.ts`) : les huit actions de la section 11.4 ont une implémentation locale réelle, `custom` excepté (« Consigne libre disponible avec un moteur IA connecté »). Une retouche qui ne changerait rien est refusée avec un message, au lieu de créer une révision identique.
- **Orchestrateur client** (`lib/generation/orchestrator.ts`, `ai-client.ts`) : choisit le moteur selon les réglages, appelle la route, bascule sur le natif avec le message « Génération IA indisponible ({reason}). Propositions produites par le moteur natif. » ; chaque retouche ajoute une `Revision` (origine, action, consigne), rien n'est écrasé.
- **Contexte commun** (`lib/generation/context-loader.ts`) : natif, IA et retouches partent exactement des mêmes faits, références, CTA, signature et hashtags. `generateNativeForBrief` est réécrit dessus, sans changement de comportement.
- **Écran Paramètres > Intelligence artificielle** (`/settings/ai`, `components/settings/`) : choix Natif / Claude / OpenAI, statut par fournisseur (« Configuré via .env », « Clé de session », « Non configuré »), clé en champ masqué avec la mention « Conservée uniquement pour cette session de navigateur. Jamais enregistrée. », modèle lu depuis le serveur (non modifiable s'il est défini en .env), « Tester la connexion » par un vrai appel (latence et modèle, ou l'erreur exacte, clé masquée). Indicateur « Natif », « Claude · connecté », « OpenAI · erreur ».
- **`AI_PROVIDER`** : lu par `/api/ai/status` et appliqué comme moteur initial au premier lancement (base neuve). Une restauration garde le choix sauvegardé.
- **`npm run check:bundle`** (`scripts/check-bundle.mjs`) : contrôle du bundle client après build (voir écart 1).

### Validation

- `typecheck`, `lint`, `format:check`, `build` : OK.
- `npm run test` : 334 tests (26 fichiers). Critères de la phase :
  - `/api/generate` sans clé renvoie `fallback: true` (« aucune clé Claude (Anthropic) configurée »), sans aucun appel réseau ;
  - aucun log ne contient la clé passée en en-tête : espions sur `console.log/info/warn/error/debug`, erreur 401 dont le corps répète la clé, sur les quatre routes ; ni les journaux ni les réponses ne la contiennent ;
  - une sortie IA contenant « samedi », absent des faits, produit un `FactWarning` de type `date`, positionné sur le mot exact.
- Les SDK sont réellement exécutés dans les tests : seul `fetch` est remplacé. Couverts aussi : en-tête d'autorisation transmis, priorité de la clé .env, clé d'en-tête refusée en production, JSON invalide puis nouvelle tentative, deux variantes au lieu de trois, erreurs 401/404/429/529, délai dépassé, `new_hook` qui touche au corps (refusé), consigne « Ne modifie que ce qui est demandé » transmise, OpenAI sans modèle (« Non configuré ») puis avec modèle (API Responses, `store: false`).
- Retouches natives : propriété sur 100 briefs aléatoires × 3 variantes × 7 actions, zéro fait inventé.
- Vérification manuelle sur le serveur de dev avec une fausse clé : vrai appel au fournisseur, 401 renvoyé, bascule propre, clé absente des journaux.
- `npm run test:e2e` : 9 scénarios OK, dont 2 nouveaux (choix du moteur ; clé de session présente dans `sessionStorage` et absente de `localStorage`, d'IndexedDB, de la sauvegarde fichier et d'un autre contexte de navigateur ; section inconnue en 404).
- `grep -r "sk-" .next/static` : voir écart 1. `npm run check:bundle` : conforme.

### Décisions et écarts

1. **Critère `grep -r "sk-" .next/static`.** Le grep littéral remonte 121 lignes, toutes des noms de classes CSS `mask-` (mask-image, mask-size...) de `tailwind-merge`, utilisé par tous les composants. Aucune chaîne ne commence par `sk-` hors d'un mot, aucun SDK ni hôte de fournisseur n'est dans le bundle client. Retirer `tailwind-merge` casserait la fusion des classes des composants : `npm run check:bundle` fait le contrôle sans ces faux positifs, et échoue si une clé apparaît (vérifié en plantant une fausse clé dans le bundle).
2. **Clé Anthropic dans `Authorization`.** Le SDK 1.11 envoie la clé en `Authorization: Bearer`, plus en `x-api-key`. Rien à faire côté application ; les tests vérifient l'en-tête réel.
3. **Modèle par défaut.** Anthropic : `claude-sonnet-5-5` si `ANTHROPIC_MODEL` est vide (valeur de `.env.example`). OpenAI : aucun défaut, le nom des modèles change trop souvent ; sans `OPENAI_MODEL` ni modèle saisi, OpenAI reste « Non configuré ». Quand le .env ne fixe pas le modèle, l'écran permet d'en saisir un, gardé en `sessionStorage` avec la clé (section 11.5 : « non modifiable dans l'UI si défini en .env »).
4. **Pas de bascule côté fournisseur.** Un refus du modèle (`stop_reason: refusal`) déclenche la bascule vers le moteur natif, qui est le repli prévu par la spec. Pas de repli serveur vers un autre modèle Claude : le modèle est choisi par l'administrateur dans le .env.
5. **Effort de réflexion** : `medium` pour la génération, `low` pour retouches et déclinaisons, pour tenir dans `AI_TIMEOUT_MS` (30 s). Un modèle ancien qui n'accepte pas ce paramètre renverra une erreur 400, affichée telle quelle par le test de connexion.
6. **Test de connexion** : lecture de la fiche du modèle (`models.retrieve`) chez les deux fournisseurs. C'est un vrai appel qui vérifie la clé et l'existence du modèle, sans générer de texte ni consommer de jetons.
7. **Post-traitement côté serveur.** La route renvoie des variantes déjà passées au linter, au Fact Guard et à l'anti-copie : un client ne peut pas recevoir une sortie IA brute. Le corps de `/api/generate` reprend les champs de la section 11.2 et ajoute ce dont le post-traitement a besoin (`hashtags`, `broadcasters`, `lint`, `signature`, `provider`).
8. **Fact Guard sur une sortie IA** : un mot écrit en minuscules dans la sortie ou dans les références n'est pas un nom propre, même en capitales ailleurs (« QUELLE VICTOIRE »). Les noms inventés restent signalés.
9. **Retouches natives sur texte modifié.** `shorten`, `punchier`, `institutional`, `new_hook` et `toggle_emojis` partent du texte affiché, donc des modifications du CM. `rephrase` retire le même modèle avec de nouvelles formulations (le modèle d'origine est désormais gardé dans la révision, champ optionnel `templateId`) ; pour un texte IA, il cherche un modèle de même structure, sinon propose « Régénérer ». `institutional` : il n'existe pas de modèles « ton institutionnel » ; la retouche limite les emojis à un, remplace les exclamations et ramène les capitales à la casse normale (les noms retrouvent la casse du brief).
10. **Déclinaison** : la route et l'adaptateur sont livrés. Le bouton « Décliner sur les autres réseaux » et sa version native (section 13) arrivent avec le Social Studio (Phase 8).
11. **Indicateur du header** : calculé (`lib/ai/indicator.ts`, `stores/ai.store.ts`) et affiché en haut de l'écran IA ; repris dans le header en Phase 7.
12. **`/settings/[section]`** : seule `ai` existe. Les autres sections (Phase 11) renvoient un 404 plutôt qu'un écran vide. `export const instant = false` : navigation bloquante assumée pour garantir le vrai 404 (Next 16.4 l'aurait sinon signalé).
13. **Correctif `twitter-text`** : sa version ESM n'a qu'un export par défaut. L'import nommé passait en test (CommonJS) mais cassait dès qu'une route serveur chargeait le linter.

### Fichiers créés ou modifiés

`lib/ai/{types,schema,prompts,keys,errors,adapter,registry,post-process,service,http,indicator,index}.ts`, `lib/ai/adapters/{anthropic,openai}.ts`, `app/api/{generate,refine,decline}/route.ts`, `app/api/ai/{test,status}/route.ts`, `app/(workspace)/settings/[section]/page.tsx`, `components/settings/{AiSettingsPage,EngineChoice,ProviderPanel}.tsx`, `hooks/useAiSettings.ts`, `stores/ai.store.ts`, `lib/generation/{context-loader,orchestrator,ai-client,service,variants}.ts`, `lib/generation/native/{engine,refine,text-refine}.ts`, `lib/database/bootstrap.ts`, `lib/platforms/counters.ts`, `types/domain.ts` (`Revision.templateId`), `scripts/check-bundle.mjs`, `package.json`, `playwright.config.ts`, `tests/fixtures/ai.ts`, `tests/unit/ai/{routes,keys-prompts}.test.ts`, `tests/unit/generation/{refine,orchestrator}.test.ts`, `tests/unit/components/provider-panel.test.tsx`, `tests/unit/database/bootstrap.test.ts`, `tests/e2e/{helpers,phase6-ai-settings.spec}.ts`.

---

## Phase 5 : Moteur natif, sans clé API (terminée le 23/11/2026)

### Livré

- **DSL des modèles** (`lib/generation/native/types.ts`) : `Template` et `Segment` de la section 10.2, avec `{var}`, `{var|upper}`, `{var|lower}`, `{var|cap}`, `{VAR_UPPER}`, emplacement d'emoji `{E}` et `{?var}` (variable exigée mais non affichée). Option écartée si une variable manque, segment supprimé s'il ne reste aucune option, modèle inéligible sans accroche.
- **Context builder** (`context.ts`) : variables dérivées du brief, de la Session Live, de l'événement et des fiches liées (`roundLabel` « 1er round », `methodPhrase`, `decisionLabel` « décision unanime », `eventLabel` « HEXAGONE MMA 12 », `dateLabel` « samedi 14 mars », `daysLeftLabel` « J-3 », `cardPositionPhrase`, `titlePhrase`, liste de la fight card, palmarès seulement si « Utiliser le palmarès » est coché...) et liste des faits autorisés.
- **342 modèles** (`templates/`) : 3 par variante pour chacune des 38 catégories, produits par une fabrique à partir des formulations de chaque catégorie. Structures nominales : punchy `H-B(-T)`, signature `H-B-I-C-S-T` (ordre ajustable selon l'empreinte du profil), storytelling `H-B-B(-Q)(-C)(-S)(-T)`.
- **Composeur** (`composer.ts`) : tirage pondéré des formulations, emojis, hashtags (en fin de post ou dans le texte selon le profil), paragraphes, empreinte de structure.
- **Moteur** (`engine.ts`) : graine = hash du brief + compteur de régénération (déterministe) ; score de la section 10.6 ; combinaison des trois variantes avec accroches mutuelles sous 0,5 de Jaccard et structures différentes, jusqu'à 5 re-tirages ; anti-copie (une variante qui recopie une référence est écartée) ; post-traitement commun.
- **Fact Guard** (`fact-guard.ts`), **anti-copie** (`anti-copy.ts`), **post-traitement** (`post-process.ts`), **rendu des signatures** (`signature.ts`) : utilisables aussi par le moteur IA (Phase 6) et l'édition CM.
- **Banque d'accroches** (`hooks.ts`) : « Garder cette accroche » généralise l'accroche en patron (`{WINNER_UPPER} frappe fort face à {loser}`), stocké dans `meta.hookBank` et inclus dans les sauvegardes ; les patrons enrichissent les options d'accroche de la catégorie.
- **Service** (`service.ts`) : rassemble le contexte stocké (réglages, règles, profil validé, références, session active, événement, signature, hashtags cochés, accroches validées récentes et gardées), lance le moteur et enregistre la génération en brouillon (`variants.ts`, section 13.7).
- Table des emojis par catégorie (`lib/editorial/emoji.ts`).

### Validation

- `typecheck`, `lint`, `format:check`, `build` : OK, sans avertissement.
- `npm run test` : 268 tests (21 fichiers), dont :
  - propriété sur 200 briefs aléatoires couvrant les 38 catégories : aucun nombre, horaire, date, diffuseur ou nom propre absent du brief, contrôle doublé d'une vérification indépendante des nombres ;
  - trois structures différentes et des accroches non similaires sur ces 200 briefs ;
  - génération native (recherche des références incluse) en moins de 50 ms pour un corpus de 2 000 wordings (médiane de 5 mesures après préchauffage ; 5 à 15 ms en pratique) ;
  - déterminisme, régénération, ordre des variantes, emojis, hashtags, règle Samba Sima, question finale, anti-copie, banque d'accroches, élision, service branché sur la base.
- Tests de charge hors suite : 1 520 briefs aléatoires (4 graines) donnent 0 fait inventé et 0 accroche trop proche ; 912 briefs réduits aux seuls champs requis (38 catégories, avec et sans session, avec et sans hashtags, 6 régénérations) donnent 0 fait inventé et 0 collision de structure.
- `npm run test:e2e` : 7 scénarios OK (inchangés).

### Décisions et écarts

1. **Modèles produits par une fabrique.** Chaque catégorie fournit ses formulations (accroches par variante, corps, détail, contexte, récit, clôture, question). La fabrique en tire 3 squelettes par variante. Aucun modèle n'est partagé entre catégories (0 %, sous le plafond de 30 %).
2. **Structures toujours distinctes.** Si deux variantes tombent sur la même empreinte (brief très court), le moteur ajoute un paragraphe de clôture neutre (« La soirée continue. », « Bonne lecture. »). Un seul cas résiduel relevé sur 1 520 briefs : sur X, avec des saisies très longues, le raccourcissement à 280 caractères retire des paragraphes et deux structures peuvent alors coïncider.
3. **Ajouts au score de la section 10.6** : −0,5 par fait essentiel absent du texte (le vainqueur d'un KO, les deux combattants d'une annonce...), +0,1 en signature pour une accroche proche d'un patron fréquent du profil (« patron d'accroche fréquent du profil » sans recopie), départage déterministe de ±0,06 pour qu'une régénération explore aussi les autres modèles.
4. **Qualité du français** : jamais deux fois la même ligne ; une suite de 3 mots déjà écrite est évitée quand une autre formulation existe ; élision automatique (« en faveur d'Ali ») sauf devant HEXAGONE (règle de la ligue) ; majuscule en début de ligne, sauf dans une citation et après un chiffre.
5. **Neutralité de genre** : les fiches combattants n'ont pas de genre. Les formulations évitent tout accord (« s'empare de la ceinture » plutôt que « nouveau champion », « au micro de » plutôt que « l'invité de »).
6. **Règle Samba Sima appliquée par le moteur** : en contexte positif, et si Samba Sima n'est ni perdant, ni challenger, ni adversaire, une ligne le présente comme un crack ou un jeune phénomène. Rien en défaite.
7. **Emojis** : emplacements `{E}` remplis avec les emojis du profil pertinents pour la catégorie, puis la table par défaut ; budget 1 à 2 en punchy, médiane du profil sinon ; 0 pour un communiqué, 1 au plus pour une défaite. Les icônes des lignes d'information (📍 🗓️ 📺) sont fixes.
8. **Question finale** : seulement en storytelling, pour les catégories DAILY qui en déclarent une, et une génération sur trois au plus (graine).
9. **CTA** : celui du brief, sinon le CTA le plus fréquent du profil pour la catégorie à condition qu'il passe le Fact Guard (« Rendez-vous samedi prochain. » apporterait une date non fournie), sinon aucun. Jamais de CTA billetterie sur une défaite ou une réaction. Punchy n'a ni CTA ni signature (structure `H-B(-T)`).
10. **Signature** : rendue seulement si ses champs requis sont présents (sinon le service renvoie la liste des champs manquants pour l'affichage « Signature incomplète ») ; les lignes d'information sont alors retirées pour ne pas répéter date et lieu.
11. **Fact Guard** : les mots du texte fixe des modèles ne sont jamais des faits (vocabulaire exempté pour les mots en capitales) ; un mot collé à un chiffre (« 2E ») fait partie du nombre. Trois faux positifs trouvés en test de charge, corrigés et couverts par des tests.
12. **Ordre du post-traitement** : nettoyage, linter, adaptation plateforme, Fact Guard, anti-copie. L'adaptation passe avant le Fact Guard pour que les passages surlignés correspondent au texte final (la section 10.7 la place en dernier).
13. **Adaptation plateforme** : retrait de paragraphes entiers par la fin, jamais l'accroche, jamais une phrase coupée.
14. **Retouches natives (section 11.4)** : livrées en Phase 6, comme le prompt les y range.

### Fichiers créés ou modifiés

`lib/generation/{fact-guard,anti-copy,post-process,signature,random,variants,service,index}.ts`, `lib/generation/native/{types,context,composer,engine,hooks}.ts`, `lib/generation/native/templates/{factory,live,daily,media,index}.ts`, `lib/editorial/emoji.ts`, `lib/format.ts`, `types/domain.ts` (`SavedHook`), `lib/database/{repository,dexie-repository,snapshot}.ts` (méta `hookBank`), `tests/fixtures/random-briefs.ts`, `tests/unit/generation/{fact-guard,native-engine,service}.test.ts`.

---

## Phase 4 : Moteur de recherche des références (terminée le 20/11/2026)

### Livré

- **Index BM25 en mémoire** (`lib/retrieval/index.ts`) : ajout, mise à jour et suppression document par document, index inversé, IDF de Robertson-Spärck Jones (k1 = 1,2, b = 0,75). Un index par mode. Tokenizer dédié (`tokenizer.ts`) : mots normalisés sans mots vides.
- **Score pondéré** (`lib/retrieval/scorer.ts`) : les 7 composantes de la section 9.1, poids lus dans `Settings.retrievalWeights`, raison principale (« Même catégorie », « Catégorie voisine », « Même combattant », « Mêmes combattants », « Même événement », « Contenu proche », « Même plateforme », « Publication récente ») et détail des contributions.
- **Retriever** (`lib/retrieval/retriever.ts`) : interface `Retriever` et `LocalBm25Retriever` (filtre dur, score, sélection de 5 à 10 références, au plus 3 par empreinte de structure). `buildRetrievalQuery` construit la requête depuis le brief : combattants reliés à leur fiche ou gardés en nom libre, événement du brief ou de la Session Live, références des 5 dernières générations, exclusions du CM.
- **Raccordement à la base** (`lib/retrieval/service.ts`) : `connectRetriever` construit l'index au chargement puis le met à jour à chaque écriture, y compris depuis un autre onglet (observation Dexie, réindexation des seuls posts modifiés). `findReferences` assemble le contexte stocké (fiches, événements, session active, générations récentes, poids).
- **Panneau « RÉFÉRENCES UTILISÉES »** (`components/editor/ReferencesPanel.tsx`, `ReferenceSheet.tsx`) : repliable, extrait sur 2 lignes, catégorie, date, score, raison ; clic pour ouvrir le post complet dans un panneau latéral avec le détail du score ; « Exclure de cette génération » puis « Régénérer ». Composant `components/ui/sheet.tsx`.
- README : fonctionnement de la recherche et évolution `PgVectorRetriever` (section 9.2).

### Validation

- `typecheck`, `lint`, `format:check`, `build` : OK, sans avertissement.
- `npm run test` : 232 tests (18 fichiers). Critères de la section 9 : un brief `live_ko` avec le combattant X classe en premier le post `live_ko` qui mentionne X ; aucun post DAILY n'est jamais retourné pour un brief LIVE (60 briefs testés sur les 12 catégories), et inversement. Aussi : démos et non-références exclues, pénalité « déjà utilisée », poids des réglages, fraîcheur, diversité, mise à jour incrémentale identique à une reconstruction, index tenu à jour depuis la base, classement de 2 000 publications en moins de 50 ms, test du panneau (ouverture, panneau latéral, exclusion, Échap, Régénérer).
- `npm run test:e2e` : 7 scénarios OK (inchangés).

### Décisions et écarts

1. **Familles de catégories LIVE.** Les catégories LIVE n'ont pas de groupe ; la note 0,5 « même groupe » restait donc inaccessible en LIVE. Champ `family` ajouté : fin de combat (résultat, KO, soumission, décision), titre (champion, défense), présence (entrée, face-off), ambiance (public, moment fort). Défaite et réaction restent seules.
2. **Combattant présent** : fiche liée au post, ou nom (complet, nom de famille, surnom) cité dans le texte, délimité comme un mot. Une publication importée sans fiche liée reste donc trouvable.
3. **Nombre de références** : jusqu'à 10 ; au-delà des 5 premières, une référence doit atteindre 40 % du meilleur score, pour ne pas compléter avec des posts sans rapport. Un score nul ou négatif n'est jamais retenu. Moins de 5 si le corpus est petit.
4. **Diversité stricte** : une 4e référence de même structure est écartée, même s'il faut alors en rendre moins de 5.
5. **BM25 normalisé** sur le meilleur score de la requête (le premier vaut 1), calculé uniquement sur les candidats qui passent le filtre dur.
6. **Panneau sans écran hôte pour l'instant** : il sera monté dans la colonne Wording Studio en Phase 8. Il n'apparaît nulle part d'ici là ; il est couvert par un test de composant.
7. **Nettoyage des tests de composants** : `tests/setup.ts` démonte les rendus entre deux tests en environnement jsdom.

### Fichiers créés ou modifiés

`lib/retrieval/{index,tokenizer,scorer,retriever,service}.ts`, `lib/categories/{types,live,registry}.ts`, `lib/format.ts`, `components/ui/sheet.tsx`, `components/editor/{ReferencesPanel,ReferenceSheet,index}.tsx`, `tests/setup.ts`, `tests/fixtures/retrieval-corpus.ts`, `tests/unit/retrieval/{retriever,service}.test.ts`, `tests/unit/components/references-panel.test.tsx`, `README.md`.

---

## Phase 3 : Intelligence éditoriale, Brand Voice Extractor (terminée le 20/11/2026)

### Livré

- **Pré-traitement** (`lib/editorial/text-utils.ts`, `stopwords-fr.ts`, `stats.ts`) : graphèmes (`Intl.Segmenter`), lignes, paragraphes, phrases, mentions, mots normalisés ; 254 mots vides français ; médiane, percentile, moyenne.
- **Extracteur** (`lib/editorial/style-extractor.ts`) : `buildStyleProfile` calcule tous les indicateurs de la section 8.3, par mode, sur les publications réelles (`isReference` et non démo ; démos seulement sur demande). Briques dédiées :
  - `cta.ts` : CTA sur les deux dernières lignes hors hashtags, par lexique éditable ou impératif en tête de ligne ;
  - `structure.ts` : empreinte H / B / I / Q / C / T / S (signatures reconnues depuis leurs gabarits en base) ;
  - `hook-pattern.ts` : patrons d'accroche, noms connus remplacés par {NOM} / {EVENT}, nombres {N}, emojis {E}, jusqu'au 3e mot. L'exemple de la section 8.4 donne exactement `{E} ko de {NOM} au {N}`.
- **Service des profils** (`lib/editorial/profile-service.ts`) : calcul enregistré comme « proposé », profil actif = dernier validé, profil en attente, validation réservée à l'administrateur, comparaison indicateur par indicateur, recalcul automatique après un import de plus de 10 publications (prêt pour la Phase 9), `styleParameters` pour les moteurs (mesures du profil validé, sinon valeurs par défaut de `rules.ts`).
- **Écran `/editorial`** : onglets LIVE SHOW, DAILY & MEDIA et Comparer ; bouton Analyser / Recalculer avec option « Inclure les exemples fictifs » et bandeau d'avertissement ; message « Corpus insuffisant pour tirer des conclusions (N publications analysées) » sous 5 posts, avec les valeurs par défaut utilisées ; blocs Longueur, Emojis, Hashtags, Accroches, Expressions récurrentes, À varier, Structures, CTA et ponctuation, chacun avec le nombre de posts analysés et la date ; tableau de comparaison et validation ; section Règles éditoriales (activation par case, listes éditables, motifs) réservée à l'administrateur.
- Composants `components/ui/{tabs,badge,input}.tsx`, hooks `useRepository` et `useActiveUser`.
- **Seed v3** : ajout de la règle « Lexique des appels à l'action » (éditable comme les autres listes).

### Validation

- `typecheck`, `lint`, `format:check`, `build` : OK, sans avertissement.
- `npm run test` : 203 tests (15 fichiers). Corpus de 20 publications fixtures : emojis (💥 12, 60 % des posts), hashtags, CTA, n-grammes, patrons d'accroche, structures, médianes et p90 vérifiés ; démos, non-références et DAILY exclus ; niveau de confiance selon la taille. Un corpus de 3 publications donne `insufficient` et aucune expression « À varier ».
- `npm run test:e2e` : 7 scénarios, dont 3 nouveaux sur l'écran ADN (corpus insuffisant, profil mesuré puis validé, règles modifiées et conservées après actualisation).
- Captures vérifiées à 1440 px et 390 px.

### Décisions et écarts

1. **Phrases répétées signalées entières.** Une phrase de 4 mots ou plus présente dans plus de 25 % des posts apparaît dans « À varier » d'un seul bloc, au lieu de 3 ou 4 n-grammes qui se chevauchent. Les n-grammes, eux, restent calculés et stockés comme le prévoit la section 8.3.
2. **N-grammes utiles.** Une expression ne commence ni ne finit par un mot vide (« ko de », « a la fin » sont écartés). Les noms connus, la marque, les nombres, les emojis, les liens et la ponctuation coupent les expressions : un nom de combattant n'est jamais signalé comme expression à varier.
3. **Noms connus** : nom complet, nom de famille et surnom des fiches combattants ; nom des événements, avec et sans numéro. « HEXAGONE MMA » suivi d'un numéro devient toujours {EVENT}. Les prénoms seuls ne sont pas remplacés (trop ambigus).
4. **Profil avec démos non validable.** Il reste consultable, avec un bandeau, mais ne peut pas alimenter les moteurs (règle 1.2).
5. **Onglet « Comparer »** : nouveau profil proposé face au profil actif du mode choisi, puis validation (section 8.8). Sans profil actif, rien n'est marqué « modifié ».
6. **Historique des profils** : tous les profils validés sont gardés ; seules les 5 dernières propositions par mode sont conservées.
7. **Valeurs par défaut** (`DEFAULT_STYLE_BY_MODE` dans `rules.ts`) : estimations de départ (LIVE : 160 caractères, 4 lignes, 2 emojis ; DAILY : 380 caractères, 7 lignes, 3 emojis), utilisées tant qu'aucun profil suffisant n'est validé.
8. **Lexique CTA** stocké comme règle éditoriale (type « consigne »), pour être modifiable au même endroit que les autres listes. « En direct » en fait partie (section 8.7) : en fin de post, une ligne de diffusion compte donc comme un CTA.
9. **Mots en capitales** : les mots de 3 lettres ou moins (KO, TKO, MMA) et la marque ne comptent pas, pour mesurer le ton « crié » et non les sigles.
10. **Schéma** : `ctas.top` accepte un `categoryId` (CTA le plus fréquent par catégorie, utile au moteur natif en section 10.5), comme `structures`.
11. **Écran sans navigation pour l'instant** : `/editorial` s'ouvre par son adresse. La barre latérale et le header arrivent en Phase 7.

### Fichiers créés ou modifiés

`lib/editorial/{stopwords-fr,stats,cta,structure,hook-pattern,style-extractor,profile-service,text-utils,rules}.ts`, `lib/platforms/counters.ts`, `lib/database/seed.ts`, `types/domain.ts`, `app/(workspace)/editorial/page.tsx`, `components/editorial/{EditorialPage,ProfilePanel,StyleProfileView,StatBlock,StatBar,CompareView,RulesSection,RuleEditor,ValuesEditor,index}.tsx`, `components/ui/{tabs,badge,input}.tsx`, `hooks/{useRepository,index}.ts`, `tests/fixtures/style-corpus.ts`, `tests/unit/editorial/{style-extractor,profile-service}.test.ts`, `tests/e2e/{helpers,phase3-editorial.spec}.ts`.

---

## Phase 2 : Catégories, règles éditoriales et linter (terminée le 20/11/2026)

### Livré

- **Registre des catégories** (`lib/categories/`) : 58 champs définis une seule fois (`fields.ts`), 12 catégories LIVE SHOW (`live.ts`) et 26 DAILY & MEDIA (`daily.ts`) conformes aux tableaux 7.2 et 7.3, avec libellé, emoji, raccourci (LIVE), champs requis et optionnels, présélections, consigne de ton et signature par défaut. Fonctions du registre (`registry.ts`) : disposition du formulaire (requis / affichés d'emblée / « Plus de détails »), visibilité conditionnelle (`showIf`), bascule du vainqueur entre les deux combattants, options lues dans les réglages ou la fight card, présélections, validation du brief avec message précis par champ, masque de temps m:ss (« 312 » → « 3:12 »).
- **Règles éditoriales** (`lib/editorial/rules.ts`) : 13 règles intégrées (section 1.6), identifiants stables, ordre d'application, valeurs par défaut du style (seuil d'emojis 6, similarité d'accroche 0,7, fenêtre de 20 accroches).
- **Service des règles** (`lib/editorial/rule-service.ts`) : lecture triée, validation (motif, options, champs obligatoires selon le type), activation et modification réservées au rôle administrateur (`RulePermissionError`).
- **Linter** (`lib/editorial/linter.ts`), renvoie `{ text, fixes, warnings }` :
  - corrections : casse de la marque, « de HEXAGONE MMA », exception « ceinture / titre d'HEXAGONE MMA », règles de remplacement personnalisées, hashtags en double, espace insécable avant ! ? : ; et espaces doubles ;
  - avertissements (positionnés pour le surlignage) : surcharge d'emojis, accroche répétée, formules d'IA, « véritable » en ouverture, question finale sur catégorie factuelle, Samba Sima (suggestion), règles interdites ou exigées personnalisées, dépassement de limite plateforme et de nombre de hashtags ;
  - `formatFixSummary` : « 1 correction éditoriale appliquée ».
- **Plateformes** (`lib/platforms/`) : limites par réseau, compteur en graphèmes (`Intl.Segmenter`), comptage pondéré officiel de X (`twitter-text`).
- **Seed v2** : les règles intégrées sont réécrites dans les bases existantes, l'activation choisie par l'administrateur est conservée. Les étapes de seed manquantes s'appliquent à chaque démarrage, y compris après une restauration.
- `text-utils` complété : accroche, ensemble de mots, Jaccard, motif insensible aux accents et aux apostrophes.

### Validation

- `typecheck`, `lint`, `format:check`, `build` (sans avertissement) : OK.
- `npm run test` : 174 tests (13 fichiers). Les trois cas imposés passent : « la victoire d'HEXAGONE MMA » → « la victoire de HEXAGONE MMA » ; « la ceinture de HEXAGONE MMA » → « la ceinture d'HEXAGONE MMA » ; « le titre d'HEXAGONE MMA » inchangé. Chaque règle a ses tests, le linter est idempotent. Le registre expose 12 catégories LIVE et 26 DAILY, chacune avec au moins un champ requis.
- `npm run test:e2e` : 4 scénarios OK (inchangés).

### Décisions et écarts

1. **Règles de remplacement entièrement décrites par leur motif.** La fenêtre de 3 mots de l'exception « ceinture / titre » est exprimée par un lookbehind de longueur variable. Le linter applique donc les règles telles qu'elles sont stockées : un administrateur peut les modifier sans toucher au code. Champ `order` ajouté à `EditorialRule`.
2. **Ordre d'application** : casse de la marque d'abord (« d'Hexagone MMA » devient « d'HEXAGONE MMA »), puis « de HEXAGONE MMA », puis l'exception ceinture / titre, puis les doublons de hashtags, enfin les espaces. La section 7.4 numérote les règles sans imposer d'ordre.
3. **Majuscule conservée** : « D'HEXAGONE MMA » en début de phrase devient « De HEXAGONE MMA ». Le pluriel est couvert (« les ceintures d'HEXAGONE MMA »).
4. **Espace insécable** : U+00A0 avant ! ? ; et avant : suivi d'une espace. Les heures (20:30), le temps de combat (3:12) et les liens ne sont jamais modifiés. U+00A0 plutôt que l'espace fine U+202F, mieux rendue partout.
5. **Renommages de champs** : le titre d'article de `media_press` devient `articleTitle`, car `title` désigne déjà la bascule « combat pour le titre » de `daily_main_event` (un champ = une définition). Le champ `cta` de `daily_ticketing` n'est pas dupliqué : le CTA passe par le bloc CTA du brief (section 13.3, point 6).
6. **Extensions de `FieldDef`** : `helpText`, `multiple`, `allowCustom` (« Autre » en soumission), `pickFrom` (bascule du vainqueur), `timeFormat` (durée m:ss ou heure 20h30, les deux de type `time`), `inputMode`, `maxLength`, source d'options `event.fightCard`. `promote` est posé sur méthode, round, type de décision, type de soumission et position sur la carte : le parcours KO (vainqueur, perdant, round) tient sans ouvrir « Plus de détails ».
7. **Extensions de `CategoryDef`** : `fieldOptions` (KO / TKO seulement en `live_ko`, Main / Co-main en `daily_main_event`), `context` (positif, neutre, négatif), `disabledRules` (Samba Sima en `live_defeat`), `ticketingCta: false` (défaite, réaction). Présélections cachées transmises aux moteurs : méthode Soumission ou Décision pour `live_sub` et `live_decision`, type de média pour les 8 catégories médias.
8. **Contexte de la règle Samba Sima** : catégorie de contexte positif, Samba Sima absent des rôles perdants (perdant, challenger en défense de titre, combattant non vainqueur en résultat), aucun mot de défaite dans le texte. Catégories neutres exclues (ambiance, réaction, partenaire, communiqué, remerciements, annonce institutionnelle, programme).
9. **Formules d'IA** : la liste de la section 7.4 (« etc. ») est complétée de cinq formules courantes, modifiable par l'administrateur.
10. **Limites plateformes** : Instagram 2 200 caractères et 30 hashtags, Facebook 63 206, X 280 en comptage pondéré, TikTok 4 000. Valeurs publiques au moment de l'écriture, regroupées dans `lib/platforms/rules.ts` pour être revérifiées facilement.
11. **Écran des règles** : la section 7.4 renvoie à `/editorial`, détaillé en section 8.9 (Phase 3). La Phase 2 livre le stockage, la validation et le contrôle admin. L'écran arrive en Phase 3.

### Fichiers créés ou modifiés

`lib/categories/{types,fields,live,daily,registry,index}.ts`, `lib/editorial/{rules,rule-service,linter,text-utils}.ts`, `lib/platforms/{rules,counters}.ts`, `lib/database/{seed,bootstrap}.ts`, `types/domain.ts` (`EditorialRule.order`), `tests/unit/categories/registry.test.ts`, `tests/unit/editorial/{linter,rule-service}.test.ts`, `tests/unit/platforms/counters.test.ts`, `tests/unit/text-utils.test.ts`, `tests/unit/database/{seed,bootstrap}.test.ts`, `tests/fixtures/entities.ts`.

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
