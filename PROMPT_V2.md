# HEXAGONE MMA SOCIAL STUDIO : V2
## Prompt d'évolution pour Claude Code

> **Mode d'emploi (pour l'humain)**
> 1. Place ce fichier à la racine du projet V1 sous le nom `PROMPT_V2.md`. Ne supprime pas `PROMPT.md`, `CLAUDE.md` ni `PROGRESS.md`.
> 2. Lance `claude` dans le dossier.
> 3. Première consigne : `Lis CLAUDE.md, PROGRESS.md puis PROMPT_V2.md en entier. Exécute la Phase V2-0. Ne passe à la phase suivante que lorsque tous ses critères de validation sont remplis.`
> 4. Pour enchaîner : `Phase suivante.` Pour reprendre après une coupure : `Lis PROGRESS.md et reprends la V2 là où tu t'es arrêté.`
> 5. Pour tester sur iPhone, lis d'abord la section 3.4.

---

## 0. CONTEXTE ET MISSION

La V1 de HEXAGONE MMA SOCIAL STUDIO existe : Studio trois colonnes, modes LIVE SHOW et DAILY & MEDIA, moteur natif, moteur IA optionnel, bibliothèque, ADN éditorial, combattants, événements, historique, persistance IndexedDB et fichier local.

La V2 ajoute six chantiers :

| # | Chantier | Résumé |
|---|---|---|
| 1 | **Interface façon iPhone** | Refonte complète du design system selon les codes iOS : tab bar, grands titres, listes groupées, sheets, swipe actions, application installable sur l'écran d'accueil. |
| 2 | **Mode jour / nuit** | Thème clair, sombre et automatique, sans flash au chargement. |
| 3 | **Atelier Français** | Correcteur orthographe, grammaire et typographie de niveau professionnel, structuré selon les grandes familles de règles travaillées par le Projet Voltaire, branché sur tous les textes de l'app. |
| 4 | **Calendrier éditorial** | Programmation des posts, rappels, vues mois / semaine / jour / agenda, export vers le calendrier du téléphone. |
| 5 | **Plans de campagne** | À partir d'une annonce de combat, génération d'une stratégie de communication complète et cohérente jusqu'au soir du combat et après. |
| 6 | **Suggestions de posts** | Propositions de publications fondées sur ce que HEXAGONE MMA a déjà publié, ce qui est planifié, les événements à venir et, en option, des flux d'actualité. |

### Méthode imposée (identique à la V1)
- Phases dans l'ordre. Une phase n'est terminée que si `npm run typecheck`, `npm run lint`, `npm run test` et les e2e concernés passent.
- À chaque fin de phase : mise à jour de `PROGRESS.md` (section « V2 »), commit `v2-phase-N: <résumé>`.
- Mets à jour `CLAUDE.md` en Phase V2-0 avec les règles de la section 1 ci-dessous.
- Aucune régression V1 : les 15 scénarios e2e de la V1 doivent toujours passer à chaque phase.
- Aucun bouton décoratif. Une fonction non disponible est masquée ou désactivée avec une explication.
- En cas d'ambiguïté, choisis l'option la plus simple qui fonctionne réellement et documente-la.

---

## 1. RÈGLES NON NÉGOCIABLES AJOUTÉES EN V2

Toutes les règles de la V1 restent en vigueur (vérité des données, honnêteté du produit, séparation des univers, statuts, sécurité des clés, règles éditoriales HEXAGONE MMA). On ajoute :

### 1.1 Projet Voltaire
- Le Projet Voltaire est un service propriétaire de la société Woonoz. **Il n'existe pas d'API publique connue** permettant de l'intégrer dans une application tierce. Ne tente aucun appel, aucun scraping, aucune reproduction de ses exercices, de ses contenus pédagogiques, de son logo ou de son interface.
- Le module s'appelle **« Atelier Français »**. La mention autorisée, en texte simple dans l'écran « À propos du correcteur » : « Règles organisées par grandes familles, sur le modèle des référentiels d'orthographe professionnelle (type Projet Voltaire). Aucun lien ni partenariat avec le Projet Voltaire. »
- Toutes les explications de règles et tous les exemples sont **rédigés pour l'application**, avec des phrases du monde du MMA.

### 1.2 Interface iOS
- On s'inspire des principes d'interface d'Apple. On ne copie ni les icônes SF Symbols (licence réservée aux plateformes Apple), ni les polices SF en fichiers embarqués. Icônes : **lucide-react**. Police : pile système (section 4.3).
- La règle V1 « pas de glassmorphism » est assouplie : un matériau translucide flouté est autorisé **uniquement** sur la barre de navigation, la tab bar et le fond des sheets, comme sur iOS. Nulle part ailleurs.

### 1.3 Calendrier et rappels
- L'application **ne publie rien** sur Instagram, Facebook, X ou TikTok. Elle planifie et rappelle. Le CM publie lui-même puis marque le post comme publié.
- Les rappels du navigateur ne fonctionnent que si l'application est ouverte (ou installée et active en arrière-plan selon les limites du système). L'interface le dit clairement. Le moyen fiable pour être alerté sur téléphone est l'**export `.ics` avec alarmes**, importé dans le calendrier du téléphone.
- Toutes les dates sont stockées en ISO 8601 UTC et affichées en **Europe/Paris** (fuseau configurable).

### 1.4 Suggestions et campagnes
- Une suggestion indique toujours **pourquoi** elle est proposée et **d'où** vient l'information (lien cliquable vers le post, l'événement, la fiche ou l'article source).
- Une suggestion issue d'un flux d'actualité ne reprend que le titre et le lien de l'article. Le CM confirme les faits avant de rédiger. Aucun fait d'un article n'est injecté dans un texte sans validation.
- Un plan de campagne ne crée aucune date, pesée, conférence de presse, face-à-face ou horaire qui n'existe pas dans la fiche événement. Les étapes dépendant d'une info manquante sont créées avec le statut « À confirmer » et sans date précise.
- Aucune statistique de performance (likes, vues, portée) n'est inventée. Elles n'existent que si le CM les saisit ou les importe.

---

## 2. CE QUI NE CHANGE PAS

- Stack : Next.js App Router, TypeScript strict, Tailwind, Dexie, Zod, Zustand, Radix / shadcn, lucide-react, Vitest, Playwright.
- Architecture `/app`, `/components`, `/lib`, `/types`, `/hooks`, `/stores`.
- Pattern `DataRepository` : toutes les nouvelles entités passent par lui et sont incluses dans la synchro fichier `data/hexagone-studio.json`, l'export JSON et les tests de round-trip.
- Moteurs natif et IA, linter éditorial, Fact Guard, anti-copie : réutilisés par les nouvelles fonctionnalités, jamais dupliqués.

---

## 3. DÉCISIONS TECHNIQUES V2

### 3.1 Dépendances ajoutées

| Besoin | Choix | Raison |
|---|---|---|
| Thème | **next-themes** (`attribute="data-theme"`, `enableSystem`) | Pas de flash au chargement, suit le réglage système. |
| Sheets iOS | **vaul** | Bottom sheets avec poignée, crans (medium / large), glisser pour fermer. |
| Animations | **motion** (ex framer-motion) | Transitions à ressort façon iOS, `useReducedMotion`. |
| Dates | **date-fns** + **date-fns-tz**, locale `fr` | Calculs fiables en Europe/Paris, changements d'heure gérés. |
| Récurrence | **rrule** | Règles RFC 5545, compatibles avec l'export ICS. |
| Export calendrier | **ics** | Génère des `.ics` avec `VALARM`. |
| Glisser-déposer | **@dnd-kit/core** | Déplacer un post dans le calendrier, accessible au clavier. |
| Flux d'actualité | **rss-parser** (côté serveur uniquement) | Lecture de flux RSS / Atom configurés par le CM. |
| Correcteur externe optionnel | **LanguageTool** auto-hébergé (Docker) | Correcteur open source avec API HTTP, appelé via une route serveur. Facultatif. |

Pas de bibliothèque de calendrier lourde : les vues sont construites à la main avec CSS Grid, pour rester fidèles au style iOS.

### 3.2 Migration de la base (Dexie version 2)

```ts
db.version(2).stores({
  // tables V1 inchangées (reprendre exactement la déclaration V1)
  calendarItems:   'id, type, status, scheduledAt, campaignId, generationId, eventId, platform, [status+scheduledAt]',
  reminders:       'id, calendarItemId, fireAt, firedAt, dismissedAt',
  campaigns:       'id, eventId, status, createdAt, *fighterIds',
  suggestions:     'id, kind, status, score, createdAt, expiresAt, dedupeKey',
  frenchRules:     'id, family, level, enabled',
  frenchDictionary:'id, word, kind',
  frenchIssues:    'id, ruleId, createdAt, resolution',   // journal des corrections, alimente les stats
  newsSources:     'id, enabled',
  newsItems:       'id, sourceId, publishedAt, url, *matchedFighterIds',
  engagement:      'id, wordingId, recordedAt'              // stats saisies ou importées par le CM
}).upgrade(tx => { /* initialisation des nouvelles tables, aucune donnée V1 modifiée */ });
```

`schemaVersion` passe à 2 dans `meta` et dans les exports. L'import d'un export V1 doit fonctionner (test obligatoire).

### 3.3 Nouvelles routes serveur

```
/api/french/check      POST  correcteur externe (LanguageTool) et passe IA optionnelle
/api/calendar/ics      POST  génère un .ics pour une sélection d'éléments
/api/campaign/plan     POST  enrichissement IA d'un plan de campagne (le plan natif est calculé côté client)
/api/suggestions/ai    POST  enrichissement IA des suggestions
/api/news/fetch        POST  récupère les flux RSS configurés (URL validées, timeout, taille max)
```

Les routes IA réutilisent les adaptateurs V1, le même prompt système de base, le même post-traitement et la même bascule vers le natif.

`/api/news/fetch` : n'accepte que des URL `http(s)` publiques. Refuse `localhost`, les IP privées et les redirections vers ces adresses (protection SSRF). Timeout 8 s, 2 Mo max par flux.

### 3.4 Utilisation sur iPhone : contraintes réelles à documenter dans le README

- `localhost` sur l'ordinateur n'est pas accessible depuis le téléphone.
- Les service workers, l'installation propre sur l'écran d'accueil et les notifications exigent **HTTPS** (sauf sur `localhost`).
- Les données IndexedDB sont **propres à chaque appareil et à chaque navigateur**. Sans synchronisation (évolution Supabase de la V1), le téléphone et l'ordinateur n'ont pas les mêmes données. L'export / import JSON permet un transfert manuel.

Options à documenter, par ordre de simplicité :
1. **Tester l'interface** sur iPhone : `next dev --experimental-https -H 0.0.0.0`, ouvrir l'adresse IP locale depuis Safari après avoir accepté le certificat. Suffisant pour juger le design, pas pour un usage quotidien.
2. **Usage réel sur téléphone** : déploiement privé (par exemple Vercel) protégé par une authentification, avec la synchro Supabase. Hors périmètre de cette V2, mais l'architecture ne doit rien empêcher.

L'écran Paramètres > Préférences affiche une carte « Utiliser l'app sur iPhone » qui résume ces points.

---

## 4. PHASE V2-0 : AUDIT, MIGRATION, SOCLE

**Tâches**
1. Lis tout le code V1. Liste dans `PROGRESS.md` les écarts entre `PROMPT.md` et le code réel, et les fonctions désactivées.
2. Lance la suite V1 complète. Corrige les tests rouges avant toute nouveauté.
3. Ajoute les dépendances de 3.1.
4. Écris la migration Dexie v2, les schémas Zod et les types des sections 7.1, 8.1, 9.1, 10.1, 11.1.
5. Étends `DataRepository`, `FileSyncService`, l'export / import JSON aux nouvelles tables.
6. Mets à jour `CLAUDE.md`.

**Critères de validation**
- Les 15 e2e V1 passent.
- Une base V1 remplie migre en v2 sans perte (test sur fixture).
- Export v2 puis import v2 : identique. Import d'un export v1 : réussi.

---

## 5. PHASE V2-1 : DESIGN SYSTEM iOS ET MODE JOUR / NUIT

Le design system est refait en premier, car tous les nouveaux écrans s'appuient dessus. Tous les écrans V1 sont migrés dans cette phase.

### 5.1 Thèmes
- Trois réglages : **Jour**, **Nuit**, **Automatique** (suit le système, valeur par défaut).
- Accès : Paramètres > Préférences > Apparence (contrôle segmenté) et bouton rapide soleil / lune dans la barre de navigation.
- `next-themes` pose `data-theme="light|dark"` sur `<html>`, avant l'hydratation (pas de flash). `data-mode="live|daily"` reste indépendant.
- `<meta name="theme-color">` change avec le thème. `color-scheme: light dark` déclaré.
- L'aperçu des réseaux sociaux a son propre interrupteur clair / sombre, car le CM doit pouvoir simuler l'application Instagram dans l'un ou l'autre mode, indépendamment du thème de l'app.

### 5.2 Tokens de couleur

Valeurs de base inspirées des couleurs système iOS, ajustées pour la marque. Toutes en variables CSS, exposées à Tailwind (`bg-bg`, `text-label`, etc.).

| Token | Jour | Nuit |
|---|---|---|
| `--bg` (fond d'écran) | `#F2F2F7` | `#000000` |
| `--bg-grouped` (fond des listes groupées) | `#F2F2F7` | `#000000` |
| `--surface` (cellules, cartes) | `#FFFFFF` | `#1C1C1E` |
| `--surface-2` (cartes dans une carte, champs) | `#F2F2F7` | `#2C2C2E` |
| `--surface-3` | `#E5E5EA` | `#3A3A3C` |
| `--label` | `#000000` | `#FFFFFF` |
| `--label-2` | `rgba(60,60,67,0.60)` | `rgba(235,235,245,0.60)` |
| `--label-3` | `rgba(60,60,67,0.30)` | `rgba(235,235,245,0.30)` |
| `--separator` | `rgba(60,60,67,0.29)` | `rgba(84,84,88,0.60)` |
| `--fill` (fond des contrôles) | `rgba(120,120,128,0.12)` | `rgba(120,120,128,0.24)` |
| `--bar-material` (barres translucides) | `rgba(249,249,249,0.80)` + `blur(20px) saturate(180%)` | `rgba(22,22,24,0.80)` + même flou |
| `--live` (remplissage) | `#E11D48` | `#F43F5E` |
| `--live-text` (texte et icônes) | `#BE123C` | `#FB7185` |
| `--daily` (remplissage) | `#D97706` | `#F59E0B` |
| `--daily-text` | `#B45309` | `#FBBF24` |
| `--success` | `#34C759` / texte `#248A3D` | `#30D158` |
| `--warning` | `#FF9500` / texte `#C93400` | `#FF9F0A` |
| `--danger` | `#FF3B30` / texte `#D70015` | `#FF453A` |

`--accent` et `--accent-text` suivent `data-mode`. Règle : le **texte** d'accent utilise toujours `--accent-text`, le **remplissage** des boutons utilise `--accent` avec un libellé blanc. Raison : l'or `#D97706` sur blanc n'atteint pas le contraste AA pour du texte courant.

Test automatisé obligatoire : un script calcule le ratio de contraste de chaque paire texte / fond utilisée et échoue sous 4,5:1 (texte courant) ou 3:1 (gros texte, icônes).

Le thème « Octogon Dark » de la V1 est remplacé par le thème Nuit. Le noir pur `#000000` du fond est assumé (rendu OLED iPhone).

### 5.3 Typographie
Pile de polices : `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif`. Sur appareil Apple, le système affiche sa propre police. Sur les autres, Inter (chargée via `next/font`). Chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour compteurs, heures et dates.

Échelle (taille / interligne / graisse), basée sur les styles iOS :

| Style | Mobile | Desktop | Usage |
|---|---|---|---|
| Large Title | 34 / 41 / 700 | 30 / 36 / 700 | Titre d'écran déplié |
| Title 1 | 28 / 34 / 700 | 26 / 32 / 700 | |
| Title 2 | 22 / 28 / 700 | 20 / 26 / 700 | Titres de section |
| Title 3 | 20 / 25 / 600 | 18 / 24 / 600 | |
| Headline | 17 / 22 / 600 | 15 / 20 / 600 | Libellé de cellule important |
| Body | 17 / 22 / 400 | 15 / 22 / 400 | Texte courant, éditeur |
| Callout | 16 / 21 / 400 | 14 / 20 / 400 | |
| Subheadline | 15 / 20 / 400 | 13 / 18 / 400 | Sous-titres de cellule |
| Footnote | 13 / 18 / 400 | 12 / 16 / 400 | En-têtes et pieds de section |
| Caption | 12 / 16 / 400 | 11 / 14 / 400 | Badges, horodatages |

Les champs de saisie font au moins **16 px** sur mobile (sinon Safari zoome au focus).

### 5.4 Formes, espacements, ombres
- Grille de 4 px. Marges latérales d'écran : 16 px (mobile), 20 px (tablette).
- Rayons : 10 px (champs, boutons), 12 px (cellules groupées, cartes), 16 px (cartes principales), 20 px (sheets, coins supérieurs). Les coins sont arrondis de façon continue : utiliser `corner-shape: squircle` en amélioration progressive quand le navigateur le supporte.
- Cibles tactiles : **44 × 44 px minimum**.
- Pas d'ombres portées sur les cellules. Ombre légère uniquement sur les éléments flottants (menus, popovers, bouton d'action flottant).
- Séparateurs de 0,5 px (`scaleY(0.5)` sur écrans Retina), avec retrait à gauche aligné sur le texte, comme dans Réglages iOS.

### 5.5 Composants (bibliothèque `/components/ui`, à refaire ou créer)

| Composant | Comportement |
|---|---|
| **NavigationBar** | Fixe en haut, matériau translucide. Grand titre qui se replie en titre centré de 17 px au défilement (piloté par un `IntersectionObserver`). Bouton retour « ‹ Précédent » avec le nom de l'écran parent. Actions à droite (2 maximum, le reste dans un menu « ⋯ »). |
| **TabBar** (mobile < 768 px) | Fixe en bas, translucide, au-dessus de `env(safe-area-inset-bottom)`. 5 onglets : **Accueil, Studio, Calendrier, Idées, Plus**. Icône + libellé 10 px. Onglet actif en `--accent`. Pastille rouge numérotée sur Calendrier (rappels du jour) et Idées (nouvelles suggestions). Toucher l'onglet actif remonte en haut de l'écran. |
| **Sidebar** (≥ 1024 px) | Style iPadOS : liste groupée sur fond `--bg-grouped`, élément actif en pilule `--fill` avec icône en accent, sections repliables, repliable entièrement. |
| **GroupedList / Cell** | Listes groupées en encart (« inset grouped »), en-tête de section en Footnote majuscule `--label-2`, pied de section explicatif. Cellule : icône dans un carré arrondi coloré de 29 px (facultatif), titre, sous-titre, valeur à droite, chevron. États pressé (fond `--fill`) et focus. |
| **SwipeActions** | Sur les cellules de liste (bibliothèque, historique, calendrier, suggestions) : glisser vers la gauche révèle les actions destructives (Supprimer en rouge, confirmation), vers la droite les actions rapides (Planifier, Dupliquer). Équivalent au clic droit et au clavier (menu contextuel) sur desktop. |
| **Sheet** (vaul) | Bottom sheet avec poignée, crans moyen / grand, glisser pour fermer, fond assombri. Remplace les modales V1 sur mobile. Sur desktop, centré en dialog de 560 px. `Échap` ferme. |
| **ActionSheet** | Menu d'actions qui monte du bas, action destructive en rouge, bouton « Annuler » séparé. Utilisé pour toutes les confirmations de suppression. |
| **ContextMenu** | Appui long (500 ms) sur mobile, clic droit sur desktop. |
| **SegmentedControl** | Fond `--fill`, segment actif en surface blanche (jour) ou `--surface-3` (nuit) avec ombre légère, animation de glissement. Remplace les toggle groups V1 (plateforme, vue calendrier, thème). |
| **Switch** | Interrupteur iOS 51 × 31 px, vert `--success` quand actif. |
| **Stepper, Picker** | Pour rounds, nombre de jours, heures. Le sélecteur d'heure utilise `input type="time"` natif sur mobile (roue iOS native). |
| **SearchField** | Champ arrondi avec loupe, bouton d'effacement, « Annuler » qui apparaît au focus sur mobile. |
| **Banner** (remplace les toasts) | Notification qui descend du haut, se ferme seule après 3 s ou par glissement vers le haut. |
| **Chip / Pill** | Catégories LIVE en pilules pleines de 44 px de haut sur mobile. |
| **Skeleton** | Pulsation douce, désactivée si mouvement réduit. |
| **EmptyState** | Icône 48 px, titre Title 3, une phrase, un bouton. |
| **FAB** | Bouton « + Nouveau wording » rond 56 px en bas à droite sur mobile, au-dessus de la tab bar, uniquement sur Accueil, Bibliothèque et Calendrier. |

### 5.6 Mouvement
- Transitions de navigation : glissement horizontal à ressort (`type: "spring", stiffness: 380, damping: 36`), retour par glissement depuis le bord gauche sur mobile.
- Sheets : ressort vertical.
- Changement de mode LIVE / DAILY : fondu de couleur 200 ms.
- `prefers-reduced-motion` : toutes les transitions deviennent des fondus de 100 ms.
- Aucune animation décorative en boucle, sauf la pastille ON AIR.

### 5.7 Application installable (PWA)
- `app/manifest.ts` : nom « HEXAGONE Social Studio », nom court « Social Studio », `display: "standalone"`, couleurs de fond et de thème, icônes 192 et 512 px (et `maskable`).
- `apple-touch-icon` 180 px, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `viewport-fit=cover`.
- Respect des zones sûres : `env(safe-area-inset-*)` sur la barre de navigation, la tab bar, les sheets et le FAB.
- Service worker minimal écrit à la main (`public/sw.js`) : cache de l'interface pour un démarrage hors ligne, gestion du clic sur notification (ouvre l'élément du calendrier concerné). Pas de mise en cache des routes `/api/*`.
- Écran Paramètres > Préférences : « Installer sur l'écran d'accueil » avec les instructions Safari (Partager > Sur l'écran d'accueil) et la carte de la section 3.4.

### 5.8 Refonte des écrans V1
- **Mobile** : Accueil, Studio (onglets Saisie / Résultats / Aperçu conservés, présentés en contrôle segmenté sous la barre de navigation), Calendrier, Idées. L'onglet **Plus** liste en cellules groupées : Bibliothèque, Combattants, Événements, Hashtags & signatures, ADN éditorial, Atelier Français, Campagnes, Historique, Publications validées, Paramètres.
- **Desktop** : sidebar iPadOS + contenu. Le Studio garde ses trois colonnes 32 / 40 / 28, chaque colonne devient une surface arrondie sur fond groupé.
- **Mode LIVE sur mobile** : bouton « Générer » collé en bas au-dessus de la tab bar, plein écran en largeur, 52 px. La tab bar se masque pendant la saisie au clavier.
- Paramètres : entièrement en listes groupées, comme Réglages iOS.

**Critères de validation**
- Captures Playwright en 390 × 844 (iPhone) et 1440 × 900, thèmes jour et nuit, modes LIVE et DAILY : Accueil, Studio, Bibliothèque, Calendrier, Paramètres. Les fichiers sont enregistrés dans `tests/screenshots/` pour revue humaine.
- Test de contraste réussi.
- Aucun flash de thème au rechargement (test e2e qui lit `data-theme` avant le premier rendu).
- Le parcours LIVE KO tient toujours en 6 interactions sur mobile.
- Lighthouse : PWA installable, accessibilité ≥ 90.

---

## 6. PHASE V2-2 : ATELIER FRANÇAIS

Objectif : qu'aucun texte ne sorte de l'application avec une faute d'orthographe, de grammaire, d'accord ou de typographie, y compris les textes tapés à la main par le CM.

### 6.1 Architecture en trois couches

```
Texte ──► Couche 1 : moteur de règles local (toujours actif, hors ligne, < 30 ms)
      ──► Couche 2 : LanguageTool auto-hébergé (optionnel, si LANGUAGETOOL_URL est défini)
      ──► Couche 3 : relecture IA (optionnelle, si un fournisseur IA est configuré)
      ──► Fusion des alertes (dédoublonnage par position) ──► Affichage
```

- `lib/french/engine.ts` : interface `FrenchChecker { check(text, ctx): Promise<FrenchIssue[]> }`. Trois implémentations, un orchestrateur.
- Couche 2 : route `/api/french/check` qui relaie vers `LANGUAGETOOL_URL` (`/v2/check`, `language=fr`). README : lancement via Docker (`docker run -p 8010:8010 erikvl87/languagetool`), variable `LANGUAGETOOL_URL=http://localhost:8010`. Si le service ne répond pas, la couche est ignorée sans erreur bloquante et l'indicateur l'affiche.
- Couche 3 : prompt strict « Corrige uniquement les fautes. Ne reformule pas, ne change pas le style, ne touche pas aux noms propres, hashtags, emojis, mentions, liens. Réponds en JSON : liste d'erreurs avec position, extrait, correction, règle. » Toute « correction » IA qui change plus de 3 mots consécutifs est rejetée.
- Ce qui n'est jamais analysé : hashtags, mentions, URL, emojis, contenu entre guillemets marqué comme citation de combattant (`live_reaction`), mots du dictionnaire maison.

### 6.2 Dictionnaire maison (`frenchDictionary`)
Alimenté automatiquement par : noms, prénoms et surnoms des fiches combattants, noms d'événements, salles, villes, diffuseurs, partenaires. Plus un lexique MMA livré (soumission, étranglement arrière, guillotine, clé de bras, kimura, triangle, sprawl, ground and pound, cage, octogone, main event, co-main event, fight card, face-off, pesée, KO, TKO, etc.). Le CM ajoute un mot en un geste depuis une alerte (« Ajouter au dictionnaire »).

Paramètre « Anglicismes du MMA » : liste des termes anglais acceptés tels quels (main event, fight card, face-off...) et de ceux pour lesquels l'app propose l'équivalent français (signalement discret, désactivable).

### 6.3 Référentiel de règles (couche 1)

Chaque règle :
```ts
interface FrenchRule {
  id: string;
  family: 'homophones' | 'accords' | 'participe_passe' | 'conjugaison' | 'pluriels' | 'confusions' |
          'majuscules' | 'typographie' | 'nombres' | 'pleonasmes' | 'syntaxe' | 'marque';
  level: 1 | 2 | 3;              // 1 fautes courantes, 2 intermédiaires, 3 subtilités
  severity: 'error' | 'warning' | 'suggestion';
  confidence: 'high' | 'medium'; // medium : affiché « À vérifier »
  detect: (tokens: Token[], text: string) => Match[];
  explanation: string;           // règle expliquée en 2 phrases, rédigée pour l'app
  examples: { wrong: string; right: string }[];  // exemples MMA
  autofix?: boolean;             // correction appliquée sans confirmation (typographie uniquement)
  enabled: boolean;
}
```

Implémente au minimum les règles suivantes. Chaque règle a ses fixtures de test (phrases fautives détectées, phrases correctes non signalées).

**Homophones grammaticaux** (niveau 1)
a / à · ou / où · et / est · son / sont · on / ont · ce / se · ces / ses / c'est / s'est / sait · ça / sa · la / là / l'a · leur / leurs · peu / peut / peux · quand / quant / qu'en · quel / quelle / qu'elle · sans / s'en / c'en · ni / n'y · si / s'y · dans / d'en · mais / mes · on / on n' (« on n'a jamais vu ça »).

**Accords** (niveaux 1 et 2)
Adjectif avec le nom · déterminant avec le nom (« ces deux combattants ») · « tout / tous / toute / toutes » · « même / mêmes » · « quelque / quelques » · couleurs simples et composées · « demi » avant et après le nom · « nu-pieds », « ci-joint » selon la position.

**Participe passé** (niveaux 2 et 3, confiance `medium` sauf cas simples)
Avec être : accord avec le sujet · avec avoir : pas d'accord avec le sujet (« elles ont gagné ») · avec avoir et COD placé avant (« la victoire qu'il a obtenue ») : détection par motif `que/qu' + sujet + avoir + participe` signalée « À vérifier » · verbes pronominaux courants (« ils se sont imposés », « ils se sont serré la main ») · infinitif ou participe après préposition et verbe (« il va gagner » / « il a gagné »).

**Conjugaison** (niveaux 1 et 2)
-é / -er / -ez / -ait / -ais après auxiliaire, préposition ou modal · futur / conditionnel 1re personne (-rai / -rais) · impératif sans -s (« Prends tes places », mais « Prends-en ») · « il a été » et non « il a était » · subjonctif après « bien que », « avant que », « pour que » · « après que » suivi de l'indicatif · présent des verbes en -dre et -indre (« il prend », « il atteint ») · « vous faites », « vous dites ».

**Pluriels et nombres** (niveaux 1 et 2)
« vingt » et « cent » (« quatre-vingts », « quatre-vingt-deux », « deux cents », « deux cent cinq ») · « mille » invariable · traits d'union dans les nombres composés · noms composés courants · pluriels en -al / -ail · ordinaux abrégés : **1er, 1re, 2e, 3e** (jamais « 2ème », « 2nd » en abrégé) et « R1 » toléré dans les textes LIVE · chiffres ou lettres selon le contexte (paramétrable).

**Confusions lexicales** (niveaux 2 et 3)
près / prêt · davantage / d'avantage · voire / voir · plutôt / plus tôt · censé / sensé · quoique / quoi que · parce que / par ce que · tâche / tache · notamment / notament · pallier (transitif direct, jamais « pallier à ») · « se rappeler quelque chose » (pas « de ») · « de suite » / « tout de suite » · « malgré que » · « au niveau de » abusif (suggestion) · « digne de ce nom » · « dû », « mû » · « le / la championne », « la combattante ».

**Pléonasmes** (suggestions)
monter en haut · au jour d'aujourd'hui · prévoir à l'avance · se réunir ensemble · voire même · reculer en arrière · panacée universelle · première primeur · tous unanimes · comme par exemple · collaborer ensemble.

**Majuscules** (niveaux 1 et 2)
Nom de peuple avec majuscule, adjectif sans (« les Français », « le MMA français ») · jours et mois en minuscule · titres d'émissions et de médias · « HEXAGONE MMA » toujours en capitales (règle marque, déjà dans le linter V1, ici mutualisée) · majuscule en début de phrase après point, y compris après un emoji en début de ligne.

**Typographie française** (corrections automatiques, désactivables)
Espace insécable fine (U+202F) avant `; ! ?` et insécable (U+00A0) avant `:` et à l'intérieur des guillemets français · guillemets « » au lieu de "" (sauf dans les URL et hashtags) · apostrophe typographique ’ (paramétrable, droite par défaut pour Instagram si le CM le préfère) · points de suspension « … » (un caractère) · pas d'espace avant la virgule et le point · espace après la virgule · insécable entre nombre et unité (« 70 kg », « 3 rounds », « 21 h ») · heures au format « 21 h » ou « 21h » selon la règle maison (paramètre, défaut « 21h », cohérent avec la signature V1) · tiret de dialogue et tirets cadratins : **remplacés par une virgule ou deux-points selon le contexte**, conforme à la charte maison.

Note pour Instagram : certaines applications affichent mal les espaces fines. Paramètre « Compatibilité réseaux sociaux » activé par défaut : U+202F remplacé par U+00A0 à la copie.

**Syntaxe et style** (suggestions)
Phrase de plus de 30 mots · double négation manquante (« on a jamais » → « on n'a jamais ») · « c'est » suivi d'un pluriel (« ce sont » suggéré) · répétition d'un même mot dans une fenêtre de 15 mots (hors mots vides et noms propres) · formules d'IA (liste V1, mutualisée).

### 6.4 Intégration dans l'interface
- **Partout où l'on écrit** : éditeur de variantes, déclinaisons, fiche wording, ajout manuel, consigne de campagne. Composant `FrenchAwareTextarea`.
- Soulignement ondulé sous le texte (calque superposé synchronisé avec le `textarea`) : rouge pour `error`, orange pour `warning` et « À vérifier », bleu pointillé pour `suggestion`.
- Toucher ou cliquer un mot souligné ouvre un **popover** (sheet compacte sur mobile) : règle en une ligne, correction proposée en gras, boutons **Corriger**, **Ignorer ici**, **Ignorer cette règle**, **Ajouter au dictionnaire** (si mot inconnu), lien « Comprendre la règle » qui ouvre la fiche de règle avec explication et exemples.
- Badge de qualité dans l'en-tête de chaque variante : « Français : 0 faute » (vert), « 2 points à vérifier » (orange), « 1 faute » (rouge). Clic : liste des alertes.
- Bouton **« Tout corriger »** : applique uniquement les corrections `high` de sévérité `error` et les corrections typographiques. Les « À vérifier » restent manuels.
- **Valider** une variante qui contient encore une `error` ouvre une ActionSheet : « 1 faute non corrigée. Corriger / Valider quand même ».
- Le moteur natif et le moteur IA passent par l'Atelier Français avant affichage. Une faute produite par un modèle natif est un bug : test de propriété sur 200 briefs aléatoires, zéro `error` de confiance `high` attendu.

### 6.5 Écran « Atelier Français » (onglet Plus)
- **Vérifier un texte** : zone de saisie libre pour coller n'importe quel texte (mail presse, communiqué, légende écrite ailleurs) et le corriger. Bouton Copier le texte corrigé.
- **Mes points faibles** : statistiques calculées sur `frenchIssues` (règles les plus souvent déclenchées sur les textes du CM, en excluant les sorties des moteurs). Barres horizontales simples, nombre d'occurrences, tendance sur 30 jours. Aucune statistique sous 10 alertes : message « Pas encore assez de données ».
- **Entraînement** : exercices courts générés à partir des **propres erreurs passées** du CM et des exemples des règles concernées. Format : phrase à trou ou choix entre deux formes, correction immédiate avec l'explication. Séries de 10. Progression enregistrée par famille de règles. Exercices rédigés pour l'app, jamais repris d'une source externe.
- **Règle du jour** : une carte sur l'Accueil, tirée parmi les règles où le CM se trompe le plus (ou au hasard si pas assez de données). Désactivable.
- **Référentiel** : liste des règles par famille et niveau, recherche, activation par interrupteur (admin), fiche détaillée.
- **Dictionnaire** : liste, ajout, suppression, import CSV.
- **Réglages** : couches actives, état de LanguageTool (bouton « Tester »), état de la relecture IA, règles maison (format des heures, apostrophe, compatibilité réseaux sociaux, anglicismes).

**Critères de validation**
- Au moins 120 règles de détection implémentées, réparties dans toutes les familles, chacune avec au moins 2 fixtures fautives et 2 fixtures correctes.
- Sur un corpus de test de 100 phrases MMA correctes, moins de 3 faux positifs de sévérité `error`.
- Fonctionne hors ligne avec la seule couche 1.
- Sans LanguageTool ni IA, aucun message d'erreur bloquant.
- Hashtags, mentions, URL, emojis et noms de combattants jamais signalés.

---

## 7. PHASE V2-3 : CALENDRIER ÉDITORIAL ET RAPPELS

### 7.1 Modèle de données

```ts
type CalendarItemType = 'post' | 'reminder' | 'campaign_step' | 'event';   // 'event' : lecture seule, issu des fiches événements
type CalendarItemStatus = 'idea' | 'to_confirm' | 'draft' | 'ready' | 'published' | 'missed' | 'cancelled';

interface CalendarItem {
  id: string; type: CalendarItemType; status: CalendarItemStatus;
  title: string;                       // ex. « Présentation de {fighter} »
  scheduledAt?: string;                // ISO UTC ; absent si 'to_confirm'
  allDay: boolean;
  platforms: Platform[];
  format?: 'post' | 'carousel' | 'reel' | 'story' | 'video' | 'thread';
  mode?: Mode; categoryId?: string;
  briefDraft?: Partial<Brief>;         // pour ouvrir le Studio pré-rempli
  generationId?: string;               // wording lié
  finalText?: string;                  // copie du texte validé au moment de la planification
  campaignId?: string; eventId?: string; fighterIds: string[];
  rrule?: string;                      // récurrence RFC 5545
  notes?: string; color?: string;
  publishedAt?: string; publishedUrl?: string;
  createdAt: string; updatedAt: string;
}

interface Reminder {
  id: string; calendarItemId: string;
  offsetMinutes: number;               // ex. -60 = 1 h avant
  fireAt: string;                      // calculé
  channels: ('in_app' | 'system')[];
  firedAt?: string; dismissedAt?: string; snoozedUntil?: string;
}
```

Les événements HEXAGONE MMA (fiches V1) apparaissent automatiquement dans le calendrier, en lecture seule, avec une couleur dédiée.

### 7.2 Vues
Contrôle segmenté en haut : **Jour · Semaine · Mois · Agenda**. Mémorisé.

- **Mois** : grille 7 colonnes, semaine commençant le lundi, pastilles de couleur par élément (rouge LIVE, or DAILY, gris rappel, bordure pour l'événement). Sur mobile, comme Calendrier iOS : grille compacte en haut, liste des éléments du jour sélectionné en dessous. Le jour courant est cerclé d'accent.
- **Semaine** : colonnes jours, lignes heures (7 h à 24 h par défaut, plage configurable), blocs positionnés. Sur mobile, défilement horizontal par jour.
- **Jour** : axe horaire, ligne rouge de l'heure actuelle.
- **Agenda** : liste groupée par jour (« Aujourd'hui », « Demain », « Samedi 12 décembre »), idéale sur iPhone. Section « À planifier » en tête pour les éléments `to_confirm` et `idea` sans date.
- Navigation : flèches précédent / suivant, bouton « Aujourd'hui », balayage horizontal sur mobile.
- **Filtres** : plateforme, mode, statut, campagne, événement.
- **Glisser-déposer** (@dnd-kit) pour déplacer un élément de date ou d'heure, avec retour arrière (Banner « Déplacé au jeudi 18 h. Annuler »). Au clavier : sélection puis `Alt + flèches`.
- **Alerte de surcharge** : badge sur un jour qui dépasse le nombre de posts maximum par jour et par plateforme (paramètre, défaut 3).

### 7.3 Créer et programmer
- Depuis le **Studio** : bouton **Planifier** sur chaque variante et après validation. Sheet : date, heure (sélecteur natif), plateformes, format, rappels (chips : À l'heure, 15 min avant, 1 h avant, La veille 18 h, Personnalisé), notes. Le texte validé est copié dans `finalText` et lié à la génération.
- Depuis le **calendrier** : toucher un créneau vide ou le FAB « + ». Choix : Post (ouvre ensuite le Studio ou garde une idée sans texte), Rappel simple.
- Depuis une **suggestion** ou une **campagne** : voir sections 8 et 9.
- **Récurrence** pour les rappels et posts réguliers (ex. « Récap du lundi ») : Quotidien, Hebdomadaire (jours cochés), Mensuel, Personnalisé. Modifier une occurrence propose « Cette occurrence / Toutes les suivantes ».

### 7.4 Fiche d'un élément (sheet)
Titre, statut (contrôle à étapes : Idée → Brouillon → Prêt → Publié), date et heure, plateformes, aperçu du texte avec l'aperçu Instagram V1 en miniature, badge Atelier Français, boutons **Ouvrir dans le Studio**, **Copier le texte**, **Marquer comme publié** (demande le lien facultatif et l'heure réelle, crée la publication dans la bibliothèque avec le statut `published` après confirmation), **Dupliquer**, **Supprimer** (ActionSheet).

Si l'heure prévue est passée sans publication : statut automatique `missed` au prochain chargement, avec une Banner « 2 posts prévus n'ont pas été marqués comme publiés ». Action rapide : Publié / Reprogrammer / Annuler.

### 7.5 Rappels : fonctionnement honnête
1. **Dans l'application** : un planificateur (`lib/calendar/scheduler.ts`) vérifie toutes les 30 secondes et à chaque retour au premier plan (`visibilitychange`) les rappels échus. Il affiche une Banner et incrémente la pastille de l'onglet Calendrier. À l'ouverture, les rappels manqués pendant que l'app était fermée sont regroupés : « 3 rappels pendant votre absence ».
2. **Notification système** : si le CM l'autorise (demande déclenchée par un geste explicite, jamais au premier chargement), le planificateur appelle `registration.showNotification()` via le service worker. Le texte de l'écran Réglages précise : « Les notifications fonctionnent tant que l'application est ouverte dans un onglet ou installée et active. Pour être sûr d'être prévenu, exportez vers le calendrier de votre téléphone. » Sur iPhone, les notifications web nécessitent l'app installée sur l'écran d'accueil et servie en HTTPS : l'afficher.
3. **Export calendrier** (le plus fiable) :
   - Par élément : « Ajouter à mon calendrier » télécharge un `.ics` avec un `VALARM` par rappel, le texte du post dans la description, le statut et un identifiant stable (`UID`) pour qu'une réimportation mette à jour au lieu de dupliquer.
   - En lot : « Exporter la période » (semaine, mois, campagne, sélection).
   - Lien « Ajouter à Google Agenda » (URL de création d'événement pré-remplie) en alternative.
4. Pas de notifications push serveur en V2. Documenter dans le README l'évolution possible (Web Push avec clés VAPID et serveur toujours actif).

### 7.6 Intégrations avec l'existant
- Accueil : bloc « Aujourd'hui » (posts du jour, rappels, éléments en retard) et « Cette semaine ».
- Studio : dans la colonne Brief, si un élément du calendrier a été ouvert, bandeau « Pour : Présentation de X, jeudi 18 h » et bouton « Enregistrer dans l'élément » au lieu de « Planifier ».
- Historique : une génération planifiée affiche sa date de programmation.

**Critères de validation**
- Créer un post depuis le Studio, le planifier demain 18 h avec rappel 1 h avant, recharger : il est dans les quatre vues.
- Le `.ics` exporté s'importe sans erreur (test de parsing avec un lecteur ICS) et contient le `VALARM`.
- Un rappel échu pendant que l'onglet est en arrière-plan s'affiche au retour.
- Changement d'heure de fin octobre : un post à 18 h Paris reste à 18 h Paris (test).
- Glisser-déposer fonctionnel à la souris, au doigt et au clavier.

---

## 8. PHASE V2-4 : PLANS DE CAMPAGNE À PARTIR D'UNE ANNONCE DE COMBAT

Objectif : à partir d'une annonce de combat, produire en un clic une stratégie de communication datée, cohérente avec le storytelling du combat, que le CM ajuste puis envoie dans le calendrier.

### 8.1 Modèle de données

```ts
interface Campaign {
  id: string; name: string;                    // ex. « Dupont vs Martin : HEXAGONE MMA 14 »
  status: 'draft' | 'active' | 'done' | 'archived';
  sourceType: 'generation' | 'wording' | 'fight';
  sourceId: string;
  eventId?: string; fighterIds: string[];
  cardPosition: 'main' | 'co-main' | 'card' | 'prelim';
  titleFight: boolean;
  intensity: 'light' | 'standard' | 'intense';
  storyline: Storyline;
  steps: CampaignStep[];
  createdAt: string; updatedAt: string;
}

interface Storyline {
  angle: string;                               // l'angle principal, en une phrase
  angleType: 'rivalry' | 'contrast' | 'redemption' | 'rise' | 'title_quest' | 'defense' | 'homecoming' | 'veteran_vs_prospect' | 'custom';
  keyFacts: { label: string; value: string; sourceRef: string }[];  // uniquement des faits des fiches
  tagline?: string;                            // fil rouge validé par le CM
  keywords: string[];                          // vocabulaire de campagne
  avoid: string[];                             // angles ou mots à éviter
  validated: boolean;
}

interface CampaignStep {
  id: string; order: number;
  phase: 'announce' | 'build_up' | 'media' | 'fight_week' | 'fight_night' | 'aftermath';
  title: string; objective: string;            // ex. « Faire découvrir le parcours de X »
  relativeDay: number;                         // J-n par rapport à l'événement (négatif avant)
  suggestedTime?: string;                      // « 18:00 », paramètre, jamais un horaire d'événement inventé
  dependsOn?: 'weigh_in' | 'press_conference' | 'open_workout' | 'media_day' | 'fight_result';
  platforms: Platform[]; format: CalendarItem['format'];
  mode: Mode; categoryId: string;
  angle: string;                               // angle spécifique de l'étape, lié au storyline
  briefDraft: Partial<Brief>;
  status: 'proposed' | 'accepted' | 'scheduled' | 'removed';
  calendarItemId?: string;
}
```

Ajouter à `HexEvent` (migration douce) : `milestones: { type: 'weigh_in'|'press_conference'|'open_workout'|'media_day'; date?: string; confirmed: boolean }[]`.

### 8.2 Points d'entrée
- Studio, catégories `daily_fight_announce` et `daily_main_event` : bouton **« Créer la campagne de ce combat »** sous la variante validée.
- Bibliothèque : action sur un wording d'annonce de combat.
- Fiche événement, fight card : action sur chaque combat.
- Onglet Plus > Campagnes > « + ».

### 8.3 Étape 1 : storyline (sheet en grand cran)
L'application assemble les **faits disponibles** depuis les fiches combattants et événement : palmarès daté, séries de victoires calculées depuis l'historique de combats saisi, club, nationalité, catégorie de poids, enjeu (titre, main event), précédent affrontement entre les deux s'il existe dans l'historique, combattant qui combat dans sa ville (si la ville du club ou une note le mentionne), écart d'expérience (nombre de combats saisis).

Puis elle propose **trois angles** (moteur natif : règles ci-dessous ; moteur IA : enrichissement dans les mêmes contraintes) :

| Condition détectée dans les faits | Angle proposé |
|---|---|
| Combat pour un titre, aucun des deux champion | `title_quest` : « Une ceinture, deux trajectoires » |
| L'un est champion | `defense` |
| Écart de combats ≥ 5 ou note « prospect » | `veteran_vs_prospect` |
| Défaite récente de l'un, puis retour | `redemption` |
| Série de 3 victoires ou plus | `rise` |
| Précédent affrontement dans l'historique | `rivalry` |
| Combattant à domicile | `homecoming` |
| Styles différents renseignés (frappeur / lutteur dans les notes ou fiches) | `contrast` |
| Aucun signal | `custom` : le CM écrit l'angle |

Chaque angle affiche les faits sur lesquels il repose (cliquables vers la fiche). Le CM choisit, modifie la phrase d'angle, ajoute une tagline et des mots-clés, puis **valide le storyline**. La règle Samba Sima de la V1 s'applique si le combattant est concerné.

### 8.4 Étape 2 : plan daté
Généré par `lib/campaign/planner.ts` à partir de gabarits par position et intensité (`lib/campaign/blueprints.ts`). Exemple de gabarit **main event, intensité standard** :

| Phase | Jour | Étape | Format | Mode / catégorie |
|---|---|---|---|---|
| announce | J0 (date d'annonce) | Annonce officielle du combat | post + story | DAILY / daily_fight_announce |
| build_up | J0 + 2 | Présentation du combattant A | carrousel | DAILY / daily_fighter_intro |
| build_up | J0 + 4 | Présentation du combattant B | carrousel | DAILY / daily_fighter_intro |
| build_up | à mi-parcours | L'enjeu : ce que change ce combat (angle du storyline) | reel | DAILY / daily_main_event |
| media | selon les présences médias saisies | Relais média | post | DAILY / media_* |
| build_up | J-14 | Rappel billetterie lié au combat | post | DAILY / daily_ticketing |
| fight_week | J-7 | Lancement de la Fight Week | post + story | DAILY / daily_fight_week |
| fight_week | jalon `media_day` / `press_conference` | Conférence, face-à-face | reel | DAILY / daily_faceoff |
| fight_week | jalon `weigh_in` | Pesée | post | DAILY / daily_faceoff |
| fight_week | J-1 | Dernier rappel, dernières places si pertinent | story | DAILY / daily_last_seats |
| fight_night | J | Entrée des combattants (préparée) | story | LIVE / live_walkout |
| fight_night | J | Résultat (deux brouillons préparés : victoire A, victoire B) | post | LIVE / live_result |
| aftermath | J+1 | Réaction du vainqueur | post | LIVE / live_reaction |
| aftermath | J+2 | Moment fort / récap | reel | LIVE / live_moment |

Règles du planificateur :
- **Intensité** : `light` retire les étapes facultatives (environ 6 étapes), `intense` ajoute compte à rebours J-30, J-10, J-3, focus parcours en deux parties, story de questions (environ 18 étapes).
- **Position** : combat classique ou préliminaire = gabarit réduit (annonce, présentation commune, rappel fight week, résultat). Co-main = gabarit standard allégé.
- **Jalons** : une étape avec `dependsOn` prend la date du jalon s'il est confirmé, sinon statut `to_confirm` sans date.
- **Date d'annonce** : la date de la génération source, sinon aujourd'hui. Les étapes qui tomberaient avant aujourd'hui sont proposées « à rattraper » ou supprimées.
- **Événement sans date** : plan relatif (J-n affichés), aucune date absolue, bannière « Ajoutez la date de l'événement pour programmer la campagne ».
- **Conflits** : le planificateur évite les jours déjà chargés (paramètre posts max par jour), décale d'un jour si possible et signale les conflits restants. Il prend en compte les autres campagnes actives du même événement pour ne pas publier deux présentations le même jour.
- **Heure suggérée** : paramètre « heures de publication préférées » par plateforme (défaut 12:30 et 18:30), jamais déduite d'un horaire d'événement.

### 8.5 Cohérence du storytelling
- Le storyline validé est injecté dans **chaque génération** issue de la campagne : moteur natif (variables `{angle}`, `{tagline}`, mots-clés prioritaires dans les segments B) et moteur IA (bloc `<campagne>` dans le prompt : angle, tagline, mots-clés, à éviter, liste des textes déjà validés de la campagne).
- **Progression narrative** : chaque étape a un objectif distinct, transmis au moteur. La consigne interdit de répéter l'accroche ou l'angle exact d'une étape déjà validée de la même campagne (anti-répétition V1 appliquée à l'échelle de la campagne).
- **Fil rouge visuel** : la tagline et un hashtag de campagne facultatif (créé dans les groupes de hashtags V1, type `campaign`) sont proposés sur chaque étape.

### 8.6 Écran campagne
- En-tête : nom, combattants, événement, date, statut, intensité (contrôle segmenté qui recalcule le plan après confirmation).
- Carte Storyline (modifiable, nouvelle validation demandée si modifiée).
- **Frise chronologique verticale** des étapes, regroupées par phase, avec date ou J-n, format, plateformes, statut. Chaque étape : Accepter, Modifier (angle, date, format), Retirer, **Rédiger** (ouvre le Studio avec le brief et le contexte campagne), Planifier.
- Bouton **« Tout ajouter au calendrier »** : crée les `CalendarItem` des étapes acceptées (statut `idea` ou `to_confirm`), avec rappels par défaut (paramètre).
- Progression : « 4 / 14 étapes publiées ».
- Export : `.ics` de la campagne, CSV du plan.

### 8.7 Moteur IA (optionnel)
`/api/campaign/plan` reçoit faits, storyline, plan natif. L'IA peut **reformuler les angles et objectifs d'étape** et proposer jusqu'à 3 étapes supplémentaires avec justification. Elle ne peut ni créer de date, ni de jalon, ni de fait. Sortie validée par Zod ; les ajouts IA sont marqués « Proposé par l'IA » et `proposed` jusqu'à acceptation.

**Critères de validation**
- Annonce d'un main event avec date d'événement et pesée confirmée : plan standard de 12 à 15 étapes, pesée à la bonne date, aucune étape avant aujourd'hui.
- Même combat sans pesée confirmée : étape pesée en `to_confirm` sans date.
- Événement sans date : plan relatif, aucune date absolue.
- Trois générations successives dans la campagne : accroches différentes, angle et tagline présents.
- Test de propriété : aucun fait, aucune date, aucun horaire hors fiches n'apparaît dans les étapes.

---

## 9. PHASE V2-5 : SUGGESTIONS DE POSTS (« IDÉES »)

Objectif : chaque matin, une liste courte et justifiée de publications pertinentes, à partir de ce que HEXAGONE MMA a publié, de ce qui est prévu et de ce qui arrive.

### 9.1 Modèle

```ts
interface Suggestion {
  id: string; kind: SuggestionKind; status: 'new' | 'seen' | 'accepted' | 'snoozed' | 'dismissed';
  title: string;                    // ex. « Présenter Jean Dupont avant HEXAGONE MMA 14 »
  why: string;                      // ex. « Combat dans 12 jours. Aucun post sur lui depuis 41 jours. »
  sources: { type: 'event'|'fighter'|'wording'|'calendar'|'campaign'|'news'|'history'; id: string; label: string }[];
  mode: Mode; categoryId: string; platforms: Platform[];
  suggestedDate?: string; score: number; priority: 'high' | 'medium' | 'low';
  briefDraft: Partial<Brief>;
  dedupeKey: string;                // empêche de reproposer la même idée
  createdAt: string; expiresAt?: string; snoozedUntil?: string;
}
```

### 9.2 Générateurs (`lib/suggestions/generators/*.ts`, un fichier par type, purs et testés)

| Type | Déclencheur (calculé sur les données réelles) | Exemple |
|---|---|---|
| `upcoming_event` | Événement dans les 45 jours, rythme de posts événement sous le seuil | « HEXAGONE MMA 14 dans 18 jours : dernier post événement il y a 9 jours. » |
| `fighter_spotlight` | Combattant de la fight card sans post associé depuis N jours | « Aucun post sur X depuis 41 jours, il combat dans 12 jours. » |
| `campaign_next` | Étape de campagne due dans les 3 jours non rédigée | « Étape "Présentation de B" prévue jeudi, pas encore rédigée. » |
| `calendar_gap` | Jour sans post alors que le rythme habituel (médiane des 8 dernières semaines) en prévoit | « Rien de prévu mercredi. Vous publiez en général 1 post le mercredi. » |
| `ticketing_push` | Événement à J-21, J-7 ou J-2 sans post billetterie récent | |
| `media_relay` | Présence médiatique saisie (fiche événement ou calendrier) sans relais publié | « Passage TV de X samedi : pas de relais prévu. » |
| `anniversary` | Résultat marquant de la bibliothèque ou de l'historique de combats il y a 1 an, 2 ans... à ±3 jours | « Il y a un an : KO de X au 1er round à HEXAGONE MMA 9. » (lien vers le post d'origine) |
| `result_followup` | Événement terminé depuis moins de 3 jours, résultats LIVE publiés mais pas de récap ni de remerciements | « Récap et remerciements de HEXAGONE MMA 13 non publiés. » |
| `unpublished_ready` | Générations validées non planifiées depuis plus de 5 jours | « 3 wordings validés attendent une date. » |
| `format_balance` | Déséquilibre sur 30 jours (ex. 0 reel, 0 portrait média) mesuré dans la bibliothèque | « Aucun portrait de combattant publié depuis 30 jours. » |
| `top_performer` | Uniquement si des stats d'engagement ont été saisies ou importées : formats ou catégories au-dessus de la médiane | « Vos posts "Face-off" font 1,8× la médiane des likes (12 posts mesurés). » |
| `news_mention` | Article d'un flux RSS configuré citant un combattant de la base | « L'Équipe cite X : relais presse possible. » (titre + lien, faits à vérifier) |

**« L'actualité de nos réseaux »** = les publications réellement enregistrées dans la bibliothèque (import, saisie, posts marqués publiés), le calendrier et l'historique. L'application ne lit pas les comptes Instagram, Facebook, X ou TikTok. Pour qu'elle reste à jour, l'écran Idées affiche « Dernière publication enregistrée : il y a 3 jours » et un raccourci « Importer mes derniers posts ». Le README documente une future connexion aux API officielles (Instagram Graph API pour un compte professionnel).

### 9.3 Statistiques d'engagement (facultatives)
- Champs optionnels sur un wording publié : likes, commentaires, partages, enregistrements, vues, portée, date de relevé. Saisie manuelle depuis la fiche ou import CSV (colonnes ajoutées au modèle CSV V1).
- Aucun calcul de performance sous 8 posts mesurés dans une catégorie. Les comparaisons affichent toujours le nombre de posts mesurés.

### 9.4 Flux d'actualité (facultatif)
- Paramètres > Sources d'actualité : ajout d'URL de flux RSS / Atom (médias spécialisés, alertes Google en RSS...), activation, test.
- Récupération via `/api/news/fetch` à l'ouverture de l'écran Idées (au plus une fois par heure) et sur bouton « Actualiser » (tirer pour rafraîchir sur mobile).
- Correspondance : nom complet ou surnom d'un combattant (sans accents, insensible à la casse), nom d'un événement. Pas de correspondance sur le prénom seul.
- Stockage : titre, lien, source, date, combattants trouvés. Pas de copie du contenu des articles.

### 9.5 Score et sélection
```
score = urgence (0-40)          // proximité de l'échéance (événement, étape, date anniversaire)
      + manque (0-25)           // jours depuis le dernier post comparable / seuil
      + importance (0-20)       // main event > co-main > card ; titre ; combattant mis en avant
      + équilibre (0-10)        // format ou catégorie sous-représenté
      + fraîcheur source (0-5)
      - pénalité si une idée proche a été refusée dans les 14 derniers jours
```
Liste du jour : **8 suggestions maximum**, au moins 2 types différents, dédoublonnage par `dedupeKey`. Recalcul au chargement de l'écran Idées et de l'Accueil, et après chaque publication marquée.

### 9.6 Écran Idées (onglet de la tab bar)
- Grand titre « Idées », sous-titre « Mis à jour à 08:42 · 6 suggestions ».
- Contrôle segmenté : **Aujourd'hui · Cette semaine · Plus tard**.
- Cartes : priorité (pastille), titre en Headline, ligne « Pourquoi » en Subheadline `--label-2`, sources en chips cliquables, mode et catégorie, date suggérée.
- Actions par carte : **Rédiger** (ouvre le Studio pré-rempli, la suggestion passe en `accepted`), **Planifier** (crée un `CalendarItem` `idea` à la date suggérée), **Plus tard** (choix : demain, dans 3 jours, la semaine prochaine), **Ignorer** (avec raison facultative : pas pertinent, déjà fait, mauvais moment ; la raison ajuste la pénalité).
- Swipe : droite = Planifier, gauche = Ignorer.
- Accueil : bloc « 3 idées pour aujourd'hui ».
- Bouton facultatif **« Affiner avec l'IA »** (si moteur IA configuré) : reformule titres et angles des suggestions, propose un angle de storytelling, sans ajouter de fait. Les sources restent celles du moteur natif.

**Critères de validation**
- Fixture : événement dans 12 jours, combattant de la fight card sans post depuis 40 jours → suggestion `fighter_spotlight` présente avec les deux sources.
- Sans aucune donnée réelle (seulement les démos) : écran vide explicatif, aucune suggestion fondée sur les exemples fictifs.
- `top_performer` absent tant que moins de 8 posts mesurés.
- Flux RSS de test : un article citant le nom complet d'un combattant crée `news_mention` avec lien ; un article citant seulement le prénom n'en crée pas.
- Une suggestion ignorée ne revient pas le lendemain.

---

## 10. PHASE V2-6 : TESTS, QA, DOCUMENTATION

### 10.1 Tests unitaires ajoutés
Contraste des tokens · thème sans flash · migration v1 → v2 · règles de l'Atelier Français (fixtures) · faux positifs sur corpus correct · fusion des couches · récurrences et fuseau horaire · génération ICS · planificateur de rappels · planificateur de campagne (gabarits, jalons, conflits) · détection d'angles · générateurs de suggestions · score et dédoublonnage · correspondance RSS · protection SSRF de `/api/news/fetch`.

### 10.2 Scénarios e2e ajoutés (en plus des 15 de la V1)
16. Parcours complet sur iPhone 390 × 844 en thème nuit : Accueil → Studio LIVE KO → Générer → Copier.
17. Bascule jour / nuit / automatique, persistance après rechargement.
18. Texte avec 5 fautes connues (« il a gagner », « la ceinture qu'il a obtenu », « 2ème round », « quatre-vingt combats », « on a jamais vu ») : toutes détectées, « Tout corriger » corrige les sûres et laisse les « À vérifier ».
19. Nom de combattant inconnu ajouté au dictionnaire : n'est plus signalé.
20. Planifier une variante validée avec rappel, retrouver l'élément dans les quatre vues, exporter le `.ics`.
21. Déplacer un post par glisser-déposer puis annuler.
22. Post planifié passé non publié : passage en « manqué » et Banner.
23. Créer une campagne depuis une annonce de main event, valider le storyline, tout ajouter au calendrier.
24. Rédiger deux étapes de la campagne : storyline présent, accroches différentes.
25. Écran Idées avec fixtures : suggestions attendues, Planifier puis Ignorer.
26. Installation PWA : manifeste valide, service worker enregistré, fonctionnement hors ligne de l'interface.

### 10.3 Audit final
- Tous les boutons déclenchent une action réelle. Liste des éléments désactivés et raisons dans `PROGRESS.md`.
- Captures de la Phase V2-1 régénérées pour tous les nouveaux écrans.
- `npm run build` propre. Aucune clé dans le bundle ni dans les exports.

### 10.4 README (sections à ajouter)
Nouveautés V2 · thèmes · utilisation sur iPhone et limites (section 3.4) · installation sur l'écran d'accueil · Atelier Français et ses trois couches · installation de LanguageTool en Docker · calendrier, rappels, export ICS et limites des notifications web · campagnes et gabarits (comment ajouter un gabarit) · suggestions et générateurs (comment en ajouter un) · flux RSS · statistiques d'engagement · évolutions futures (Supabase, Web Push, API Meta).

---

## 11. ORDRE DE PRIORITÉ SI LE TEMPS MANQUE

1. Design system iOS et thèmes (tout le reste en dépend).
2. Atelier Français, couche 1 et intégration dans l'éditeur.
3. Calendrier : vues, planification depuis le Studio, rappels in-app, export ICS.
4. Campagnes : storyline, plan natif, envoi au calendrier.
5. Suggestions : générateurs internes.
6. Options : LanguageTool, relecture IA, flux RSS, enrichissements IA, entraînement français, stats d'engagement.

Une fonctionnalité simple qui marche vaut mieux qu'une fonctionnalité impressionnante mais fictive.

---

## 12. DÉFINITION DU « TERMINÉ » V2

La V2 est terminée quand le Community Manager peut, sans clé API :
- ouvrir l'application sur iPhone, en thème jour ou nuit, et s'y retrouver comme dans une app native ;
- rédiger un post de KO en moins de 30 secondes, sans une seule faute de français ;
- coller n'importe quel texte dans l'Atelier Français et récupérer une version corrigée, avec l'explication de chaque correction ;
- valider une annonce de main event, obtenir une campagne complète et cohérente jusqu'au lendemain du combat, et l'envoyer dans son calendrier en un geste ;
- recevoir ses rappels dans l'app et dans le calendrier de son téléphone via l'export ;
- ouvrir l'onglet Idées le matin et trouver des propositions justifiées par ce que HEXAGONE MMA a réellement publié et prévu.

Le CM reste maître de la rédaction, de la validation et de la publication.
