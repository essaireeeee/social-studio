import { create } from "zustand";
import type { LintFix } from "@/lib/editorial/linter";
import type { SignatureIssue } from "@/lib/generation/context-loader";
import type { PostProcessResult } from "@/lib/generation/post-process";
import type { ReferenceResult } from "@/lib/retrieval/retriever";
import type { Platform, RefineAction } from "@/types/domain";

export interface Declination {
  variantId: string;
  versions: Partial<Record<Platform, PostProcessResult>>;
}

interface StudioSessionState {
  generating: boolean;
  /** Erreurs du brief par champ (`category` : aucune catégorie). */
  errors: Record<string, string>;
  /** Message de bascule vers le moteur natif, à afficher tel quel. */
  notice?: string;
  references: ReferenceResult[];
  excludedIds: string[];
  signatureIssue?: SignatureIssue;
  /** Corrections du linter appliquées à chaque révision produite dans cette session. */
  fixesByRevision: Record<string, LintFix[]>;
  /** Retouche en cours, par variante. */
  busy: Record<string, RefineAction | "decline" | undefined>;
  declination?: Declination;
  /** Nombre de générations par brief identique : fait varier les formulations. */
  counts: Record<string, number>;
  /** Texte en cours de frappe, par variante : l'aperçu le suit à chaque touche. */
  liveText: Record<string, string>;
  setLiveText: (variantId: string, text: string | undefined) => void;
  patch: (patch: Partial<StudioSessionState>) => void;
  setBusy: (variantId: string, action: RefineAction | "decline" | undefined) => void;
  addFixes: (fixes: Record<string, LintFix[]>) => void;
  toggleExcluded: (id: string) => void;
}

/** État de travail du Studio, non persisté (la génération elle-même est en base). */
export const useStudioSession = create<StudioSessionState>((set) => ({
  generating: false,
  errors: {},
  references: [],
  excludedIds: [],
  fixesByRevision: {},
  busy: {},
  counts: {},
  liveText: {},
  setLiveText: (variantId, text) =>
    set((s) => {
      const liveText = { ...s.liveText };
      if (text === undefined) delete liveText[variantId];
      else liveText[variantId] = text;
      return { liveText };
    }),
  patch: (patch) => set(patch),
  setBusy: (variantId, action) => set((s) => ({ busy: { ...s.busy, [variantId]: action } })),
  addFixes: (fixes) => set((s) => ({ fixesByRevision: { ...s.fixesByRevision, ...fixes } })),
  toggleExcluded: (id) =>
    set((s) => ({
      excludedIds: s.excludedIds.includes(id)
        ? s.excludedIds.filter((x) => x !== id)
        : [...s.excludedIds, id],
    })),
}));
