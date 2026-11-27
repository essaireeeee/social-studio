"use client";

import { useEffect, useRef, useState } from "react";
import { FrenchAwareTextarea } from "@/components/french/FrenchAwareTextarea";
import { FrenchBadge } from "@/components/french/FrenchBadge";
import { RuleSheet } from "@/components/french/RuleSheet";
import { useFrenchEditor } from "@/hooks/useFrenchEditor";
import { useRepository } from "@/hooks/useRepository";
import type { FrenchAuthor } from "@/lib/french/journal";
import { formatFixSummary, lintText, type LintContext } from "@/lib/editorial/linter";
import { EDIT_MERGE_WINDOW_MS } from "@/lib/studio/revisions";
import { saveEdit } from "@/lib/studio/actions";
import { useStudioSession } from "@/stores/studio-session.store";
import type { Mode, Revision } from "@/types/domain";

const SAVE_DELAY_MS = 500;
const FACT_LABELS: Record<string, string> = {
  number: "Nombre",
  time: "Horaire",
  date: "Date",
  proper_noun: "Nom",
  broadcaster: "Diffuseur",
  price: "Prix",
  other: "Information",
};

interface VariantEditorProps {
  generationId: string;
  variantId: string;
  revision: Revision;
  lint: LintContext;
  label: string;
  mode: Mode;
  categoryId: string;
}

/** Auteur du texte pour le journal : le CM dès qu'il a modifié la variante. */
export function authorOf(revision: Revision): FrenchAuthor {
  if (revision.origin === "cm_edit") return "cm";
  return revision.origin === "native" ? "native" : "ai";
}

/**
 * Éditeur d'une variante (section 13.4) : l'aperçu suit chaque frappe ; sauvegarde
 * automatique (500 ms) dans une révision `cm_edit`, complétée tant que le CM n'a pas quitté
 * le champ plus de 5 s ; corrections du linter appliquées en quittant le champ.
 */
export function VariantEditor({
  generationId,
  variantId,
  revision,
  lint,
  label,
  mode,
  categoryId,
}: VariantEditorProps) {
  const repository = useRepository();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(revision.text);
  const [seenId, setSeenId] = useState(revision.id);
  // Révision d'édition en cours : ref pour les gestionnaires, état pour le rendu.
  const own = useRef<string | undefined>(undefined);
  const [ownId, setOwnId] = useState<string | undefined>(undefined);
  const lastBlur = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fixes = useStudioSession((s) => s.fixesByRevision[revision.id]);

  // Nouvelle révision venue d'ailleurs (retouche, restauration) : l'éditeur la reprend.
  if (revision.id !== seenId) {
    setSeenId(revision.id);
    if (revision.id !== ownId) setText(revision.text);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const save = async (value: string) => {
    if (!repository) return;
    const id = await saveEdit(repository, generationId, variantId, {
      text: value,
      factWarnings: [],
      now: new Date(),
      mergeInto: own.current,
    });
    own.current = id;
    setOwnId(id);
  };

  const onChange = (value: string) => {
    setText(value);
    useStudioSession.getState().setLiveText(variantId, value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(value), SAVE_DELAY_MS);
  };

  const onFocus = () => {
    // Plus de 5 s hors du champ : la prochaine frappe ouvre une nouvelle révision.
    if (Date.now() - lastBlur.current > EDIT_MERGE_WINDOW_MS) own.current = undefined;
  };

  const onBlur = async () => {
    lastBlur.current = Date.now();
    clearTimeout(timer.current);
    if (text === revision.text && revision.origin !== "cm_edit") return;
    const linted = lintText(text, lint);
    if (linted.text !== text) setText(linted.text);
    // Le texte en cours reste la référence des actions (Valider, Copier) jusqu'à la fin de
    // l'enregistrement : un clic sur « Valider » juste après la frappe contrôle ce texte-là.
    useStudioSession.getState().setLiveText(variantId, linted.text);
    if (linted.text !== revision.text) {
      await save(linted.text);
      if (own.current) useStudioSession.getState().addFixes({ [own.current]: linted.fixes });
    }
    useStudioSession.getState().setLiveText(variantId, undefined);
  };

  const french = useFrenchEditor({
    text,
    onText: (next) => {
      onChange(next);
      // Correction hors du champ : enregistrée tout de suite, sans attendre la frappe.
      clearTimeout(timer.current);
      void save(next);
    },
    author: text === revision.text ? authorOf(revision) : "cm",
    categoryId,
    mode,
  });
  const warnings = lintText(text, lint).warnings.filter((w) => w.kind !== "ai_formula");
  const facts = text === revision.text ? revision.factWarnings : [];
  const select = (start: number, end: number) => {
    ref.current?.focus();
    ref.current?.setSelectionRange(start, end);
  };

  return (
    <div className="flex flex-col gap-2">
      {french.ready ? (
        <FrenchBadge
          issues={french.issues}
          actions={french.actions}
          remote={french.remote}
          onExplain={french.setExplain}
        />
      ) : null}
      <FrenchAwareTextarea
        ref={ref}
        id={`editor-${variantId}`}
        aria-label={label}
        autoResize
        rows={4}
        value={text}
        onValueChange={onChange}
        issues={french.issues}
        actions={french.actions}
        onExplain={french.setExplain}
        onFocus={onFocus}
        onBlur={() => void onBlur()}
        className="text-sm leading-[1.6]"
      />
      <RuleSheet ruleId={french.explain} onClose={() => french.setExplain(null)} />
      {facts.length > 0 ? (
        <div
          className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning/5 p-2"
          role="note"
        >
          <p className="text-xs font-medium text-warning">
            Information absente du brief : à vérifier
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {facts.map((w) => (
              <li key={`${w.start}-${w.value}`}>
                <button
                  type="button"
                  onClick={() => select(w.start, w.end)}
                  className="cursor-pointer rounded-sm border border-warning/40 px-1.5 py-0.5 text-xs text-warning hover:bg-warning/10"
                >
                  {FACT_LABELS[w.kind]} : « {w.value} »
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {warnings.map((w, i) => (
            <li key={`${w.ruleId}-${i}`} className="text-xs text-warning">
              {w.start !== undefined && w.end !== undefined ? (
                <button
                  type="button"
                  className="cursor-pointer text-left hover:underline"
                  onClick={() => select(w.start!, w.end!)}
                >
                  {w.message}
                </button>
              ) : (
                w.message
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {fixes && fixes.length > 0 ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {formatFixSummary(fixes)}
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5 pl-4">
            {fixes.map((fix) => (
              <li key={fix.ruleId}>
                {fix.label}
                {fix.count > 1 ? ` (×${fix.count})` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
