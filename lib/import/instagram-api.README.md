# Connexion future à l'API officielle Instagram

Ce document décrit une évolution possible. **Rien n'est implémenté** : l'application ne
contacte jamais Instagram, ne lit aucune page et ne fait aucun scraping. Les liens saisis
dans la bibliothèque sont stockés tels quels, jamais appelés.

## Aujourd'hui

- **Coller un texte** dans la bibliothèque (lien facultatif, stocké seulement).
- **Fichier d'export Instagram** (« Télécharger vos informations » de Meta, format JSON),
  lu entièrement dans le navigateur par `instagram-export.ts`.

## Ce qu'exigerait une connexion officielle

1. Un **compte Instagram professionnel** (Business ou Creator) relié à une **Page Facebook**.
2. Une **application Meta** déclarée sur developers.facebook.com, avec le produit
   « Instagram API » et les autorisations de lecture des médias du compte
   (`instagram_basic` ou son équivalent actuel), soumises à la **vérification d'application**
   de Meta.
3. Une **connexion OAuth** faite par un administrateur du compte, et un jeton stocké
   uniquement côté serveur (variables d'environnement ou coffre de secrets), jamais dans
   IndexedDB, localStorage ni les sauvegardes, comme les clés IA (section 1.5).
4. Une **route serveur** (`/api/instagram/media`) qui lit les légendes et dates des
   publications du compte, puis les fait passer par l'étape « Vérifier » de l'import
   (classifieur, doublons), comme un fichier d'export.

## Règles à conserver

- Uniquement l'API officielle, uniquement le compte de la ligue, avec son consentement.
- Aucun contournement des restrictions de Meta, aucune collecte de comptes tiers.
- Respect des limites de débit et des conditions d'utilisation de la plateforme Meta.
