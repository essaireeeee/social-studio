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

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Radix UI (composants shadcn/ui copiés dans `components/ui`), Zustand, Dexie (IndexedDB), Zod, papaparse, exceljs, twitter-text, jsdiff, SDK Anthropic et OpenAI, Vitest, Playwright.
