# Évolution Supabase (non implémentée en v1)

La v1 stocke tout dans IndexedDB (`DexieRepository`) et sauvegarde un instantané dans `data/hexagone-studio.json`. Ce document décrit comment ajouter un `SupabaseRepository` pour la synchro multi-postes, les comptes utilisateurs et la recherche sémantique. Aucun code factice n'existe pour l'instant.

## Principe

`SupabaseRepository` implémente la même interface `DataRepository` (`lib/database/repository.ts`). Le reste de l'application ne change pas : elle reçoit simplement une autre implémentation via `createDataServices()` (`lib/database/client.ts`).

Les schémas Zod de `types/domain.ts` restent la référence. Chaque ligne lue depuis Supabase est validée par le même schéma qu'en local.

## Mapping des tables

| Table Dexie     | Table Postgres    | Clé                      | Colonnes indexées                                                                                                                 | Particularités                                                                                                       |
| --------------- | ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `wordings`      | `wordings`        | `id uuid`                | `mode`, `category_id`, `platform`, `event_id`, `date`, `content_hash` (unique), `status`, `is_demo`, `is_reference`, `updated_at` | `fighter_ids`, `tags`, `hashtags`, `emojis` en `text[]` avec index GIN. Colonne `embedding vector(…)` pour pgvector. |
| `fighters`      | `fighters`        | `id`                     | `last_name`, `nickname`, `weight_class`, `updated_at`                                                                             | `record` et `fight_history` en `jsonb`.                                                                              |
| `events`        | `events`          | `id`                     | `date`, `name`, `updated_at`                                                                                                      | `links`, `broadcasters`, `fight_card` en `jsonb`.                                                                    |
| `liveSessions`  | `live_sessions`   | `id`                     | `active`, `started_at`                                                                                                            | Index unique partiel sur `active = true` : une seule session active.                                                 |
| `generations`   | `generations`     | `id`                     | `created_at`, `status`, `(brief->>'mode', created_at)`                                                                            | `brief`, `variants`, `declinations` en `jsonb`.                                                                      |
| `hashtagGroups` | `hashtag_groups`  | `id`                     | `kind`                                                                                                                            | `tags text[]`, `modes text[]`.                                                                                       |
| `signatures`    | `signatures`      | `id`                     |                                                                                                                                   | `required_fields text[]`, `modes text[]`.                                                                            |
| `rules`         | `editorial_rules` | `id`                     | `enabled`                                                                                                                         | Écriture réservée au rôle admin (RLS).                                                                               |
| `styleProfiles` | `style_profiles`  | `id`                     | `mode`, `created_at`, `status`                                                                                                    | Indicateurs en `jsonb`.                                                                                              |
| `users`         | `profiles`        | `id` (= `auth.users.id`) |                                                                                                                                   | `role` contrôlé par RLS, plus seulement en local.                                                                    |
| `blobs`         | Supabase Storage  | chemin                   |                                                                                                                                   | Bucket privé `studio-assets` ; la table garde le chemin, plus le base64.                                             |
| `meta`          | `app_meta`        | `key`                    |                                                                                                                                   | `settings` par organisation ou par utilisateur.                                                                      |

Conventions : noms de colonnes en `snake_case`, conversion `camelCase` ↔ `snake_case` dans le repository. Les booléens deviennent indexables (contrairement à IndexedDB).

## Sécurité

- Row Level Security activée sur toutes les tables.
- Les clés API des fournisseurs IA ne transitent jamais par Supabase (règle 1.5).
- La clé `service_role` reste côté serveur, jamais dans le bundle client.

## Migration des données locales

L'export JSON (`exportAll()`) sert de format d'échange : `importAll(snapshot, "merge")` côté Supabase reprend un poste existant sans doublon (même `id` ou même `contentHash`).

## Recherche sémantique

Voir `PgVectorRetriever` (README principal, Phase 4) : embeddings stockés dans `wordings.embedding`, filtre dur par `mode` avant la recherche de similarité.
