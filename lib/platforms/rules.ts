/**
 * Contraintes des plateformes. Limites publiques au moment de l'écriture :
 * à revérifier si une plateforme change ses règles.
 */
import type { Platform } from "@/types/domain";

export interface PlatformRule {
  label: string;
  /** Longueur maximale de la légende. */
  maxLength: number;
  /** Méthode de comptage : graphèmes visibles, ou comptage pondéré officiel de X. */
  counter: "graphemes" | "twitter";
  /** Seuil d'alerte avant la limite (X : anneau orange à 260). */
  warnAt?: number;
  maxHashtags?: number;
  /** Coupure « … plus » simulée dans l'aperçu (réglable dans Préférences). */
  defaultTruncation?: number;
}

export const PLATFORM_RULES: Readonly<Record<Platform, PlatformRule>> = {
  instagram: {
    label: "Instagram",
    maxLength: 2200,
    counter: "graphemes",
    maxHashtags: 30,
    defaultTruncation: 125,
  },
  facebook: { label: "Facebook", maxLength: 63206, counter: "graphemes", defaultTruncation: 480 },
  x: { label: "X", maxLength: 280, counter: "twitter", warnAt: 260 },
  tiktok: { label: "TikTok", maxLength: 4000, counter: "graphemes" },
};

export const PLATFORMS: readonly Platform[] = ["instagram", "facebook", "x", "tiktok"];
