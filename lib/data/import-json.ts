/**
 * Lecture d'un export JSON avant import (section 16.3) : contrôle du format, refus des
 * champs de type clé, migration vers le schéma courant et aperçu des volumes.
 */
import { SnapshotError, migrateSnapshot } from "@/lib/database/migrations";
import {
  countSnapshot,
  findForbiddenFields,
  type Snapshot,
  type SnapshotCounts,
} from "@/lib/database/snapshot";

export type SnapshotPreview =
  | { ok: true; snapshot: Snapshot; counts: SnapshotCounts; exportedAt: string }
  | { ok: false; error: string };

export function readSnapshotText(text: string): SnapshotPreview {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un JSON lisible." };
  }
  const forbidden = findForbiddenFields(raw);
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: "Le fichier contient des champs interdits (clé, jeton ou secret) : import refusé.",
    };
  }
  try {
    const snapshot = migrateSnapshot(raw);
    return { ok: true, snapshot, counts: countSnapshot(snapshot), exportedAt: snapshot.exportedAt };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof SnapshotError
          ? error.message
          : "Ce fichier n'est pas un export de HEXAGONE MMA Social Studio.",
    };
  }
}

/** Libellés des tables dans les aperçus. */
export const TABLE_LABELS: Record<keyof SnapshotCounts, string> = {
  wordings: "Publications",
  fighters: "Combattants",
  events: "Événements",
  liveSessions: "Sessions Live",
  generations: "Générations",
  hashtagGroups: "Groupes de hashtags",
  signatures: "Signatures",
  rules: "Règles éditoriales",
  styleProfiles: "Profils de style",
  users: "Utilisateurs",
  blobs: "Images",
  calendarItems: "Éléments du calendrier",
  reminders: "Rappels",
  campaigns: "Campagnes",
  suggestions: "Idées",
  frenchRules: "Règles de français",
  frenchDictionary: "Mots du dictionnaire",
  frenchIssues: "Alertes de français",
  newsSources: "Sources d'actualité",
  newsItems: "Articles d'actualité",
  engagement: "Relevés d'engagement",
};
