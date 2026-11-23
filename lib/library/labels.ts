/** Libellés d'interface de la bibliothèque. */
import type { Source, Wording } from "@/types/domain";

export const DEMO_BADGE_SHORT = "EXEMPLE FICTIF";
export const DEMO_BADGE = "EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE";

export const STATUS_LABELS: Record<Wording["status"], string> = {
  published: "Publié",
  validated: "Validé",
};

export const SOURCE_LABELS: Record<Source, string> = {
  manual: "Ajout manuel",
  bulk: "Collage en masse",
  csv: "Fichier CSV",
  excel: "Fichier Excel",
  instagram_export: "Instagram",
  studio: "Studio",
  demo: "Démonstration",
};
