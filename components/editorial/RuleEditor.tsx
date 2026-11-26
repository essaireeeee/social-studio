"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateRule } from "@/lib/editorial/rule-service";
import type { EditorialRule } from "@/types/domain";
import { ValuesEditor } from "./ValuesEditor";

const KIND_LABELS: Record<EditorialRule["kind"], string> = {
  replace: "Remplacement",
  forbid: "Interdiction",
  require: "Exigence",
  contextual: "Consigne",
};

interface RuleEditorProps {
  rule: EditorialRule;
  canEdit: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  onSave: (rule: EditorialRule) => Promise<void>;
}

export function RuleEditor({ rule, canEdit, onToggle, onSave }: RuleEditorProps) {
  const [draft, setDraft] = useState(rule);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Affichage immédiat du choix ; retour à l'état enregistré si l'écriture échoue.
  const [enabled, setEnabled] = useState(rule.enabled);

  // La règle stockée a changé (enregistrement, autre onglet) : on repart de sa nouvelle version.
  const [stored, setStored] = useState(rule);
  if (JSON.stringify(stored) !== JSON.stringify(rule)) {
    setStored(rule);
    setDraft(rule);
    setEnabled(rule.enabled);
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(rule);
  const fieldId = `rule-${rule.id}`;

  const update = (patch: Partial<EditorialRule>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const save = async () => {
    const problems = validateRule(draft);
    setErrors(problems);
    if (problems.length > 0) return;
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Enregistrement impossible."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-card p-4 squircle">
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
          checked={enabled}
          disabled={!canEdit}
          onChange={(event) => {
            const next = event.target.checked;
            setEnabled(next);
            onToggle(next).catch((error: unknown) => {
              setEnabled(rule.enabled);
              setErrors([error instanceof Error ? error.message : "Modification impossible."]);
            });
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor={fieldId}
            className="flex flex-wrap items-center gap-2 text-sm font-medium"
          >
            {rule.label}
            <Badge>{KIND_LABELS[rule.kind]}</Badge>
            {enabled ? null : <Badge variant="warning">Désactivée</Badge>}
          </label>
          {rule.description ? (
            <p className="text-13 text-muted-foreground">{rule.description}</p>
          ) : null}
        </div>
      </div>

      {draft.values ? (
        <ValuesEditor
          label={rule.label}
          values={draft.values}
          disabled={!canEdit}
          onChange={(values) => update({ values })}
        />
      ) : null}

      {rule.pattern !== undefined ? (
        <details className="text-13">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Motif
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_6rem]">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Expression régulière
              <Input
                className="font-mono text-xs"
                value={draft.pattern ?? ""}
                disabled={!canEdit}
                onChange={(event) => update({ pattern: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Options
              <Input
                className="font-mono text-xs"
                value={draft.flags ?? ""}
                disabled={!canEdit}
                onChange={(event) => update({ flags: event.target.value })}
              />
            </label>
            {rule.kind === "replace" ? (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
                Remplacement
                <Input
                  className="font-mono text-xs"
                  value={draft.replacement ?? ""}
                  disabled={!canEdit}
                  onChange={(event) => update({ replacement: event.target.value })}
                />
              </label>
            ) : null}
          </div>
        </details>
      ) : null}

      {errors.length > 0 ? (
        <ul role="alert" className="text-13 text-danger">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {canEdit && (dirty || saved) ? (
        <div className="flex items-center justify-end gap-3">
          {saved && !dirty ? <span className="text-13 text-success">Enregistré</span> : null}
          {dirty ? (
            <>
              <Button variant="ghost" onClick={() => setDraft(rule)}>
                Annuler
              </Button>
              <Button onClick={save} loading={saving}>
                Enregistrer
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
