"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryData } from "@/hooks/useLibraryData";
import { useRepository } from "@/hooks/useRepository";
import { getCategoriesByMode } from "@/lib/categories/registry";
import { createClassifier } from "@/lib/import/classifier";
import type { Duplicate } from "@/lib/import/dedupe";
import { checkDuplicate, dedupeItems, saveWording } from "@/lib/library/actions";
import {
  formErrors,
  withCategory,
  withMode,
  withText,
  type FormErrors,
  type FormField as Field,
  type WordingFormValues,
} from "@/lib/library/form";
import { MODE_LABELS } from "@/lib/shell/mode";
import { toast } from "@/stores/toast.store";
import type { Mode, Wording } from "@/types/domain";
import { FormField } from "@/components/ui/form-field";
import { WordingFormFields } from "./WordingFormFields";
import { excerptOf } from "./WordingRow";

const FIELD_IDS: Record<Field, string> = {
  text: "wf-text",
  categoryId: "wf-category",
  fighters: "wf-fighters",
  instagramUrl: "wf-url",
  date: "wf-date",
};

interface WordingFormProps {
  title: string;
  initial: WordingFormValues;
  /** Publication modifiée ; absente pour un ajout ou une duplication. */
  existing?: Wording;
  data: LibraryData;
  /** Enregistrement propre à l'appelant (Studio) ; par défaut, `saveWording`. */
  onSave?: (values: WordingFormValues) => Promise<unknown>;
  savedMessage?: string;
  onClose: () => void;
}

/** Fiche publication (section 14.2), avec contrôle des doublons avant enregistrement. */
export function WordingForm({
  title,
  initial,
  existing,
  data,
  onSave,
  savedMessage,
  onClose,
}: WordingFormProps) {
  const repository = useRepository();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [duplicate, setDuplicate] = useState<Duplicate>({ kind: "new" });
  const [busy, setBusy] = useState(false);
  const classify = useMemo(
    () =>
      createClassifier(
        data.wordings.map((w) => ({
          id: w.id,
          text: w.text,
          categoryId: w.categoryId,
          isDemo: w.isDemo,
        })),
      ),
    [data.wordings],
  );
  const update = (patch: Partial<WordingFormValues>) => setValues((v) => ({ ...v, ...patch }));
  const match =
    duplicate.kind === "new" ? undefined : data.wordings.find((w) => w.id === duplicate.of);

  const submit = async () => {
    if (!repository) return;
    const found = formErrors(values, data.fighters);
    setErrors(found);
    const first = (Object.keys(FIELD_IDS) as Field[]).find((f) => found[f]);
    if (first) return document.getElementById(FIELD_IDS[first])?.focus();
    setBusy(true);
    try {
      const status = await checkDuplicate(values.text, dedupeItems(data.wordings), existing?.id);
      const confirmed =
        status.kind === "near" && duplicate.kind === "near" && duplicate.of === status.of;
      if (status.kind === "exact" || (status.kind === "near" && !confirmed)) {
        setDuplicate(status);
        return;
      }
      if (onSave) await onSave(values);
      else await saveWording(repository, values, { fighters: data.fighters, existing });
      toast(
        savedMessage ??
          (existing ? "Publication modifiée" : "Publication ajoutée à la bibliothèque"),
        "success",
      );
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const categories = getCategoriesByMode(values.mode);
  const suggested = values.categoryId && values.confidence !== null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Seul le texte est requis. La catégorie, les hashtags et l&apos;appel à l&apos;action sont
          proposés à partir du texte.
        </DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField id="wf-text" label="Texte intégral" error={errors.text}>
            <Textarea
              id="wf-text"
              autoResize
              rows={6}
              required
              value={values.text}
              aria-invalid={Boolean(errors.text) || undefined}
              aria-describedby={errors.text ? "wf-text-error" : undefined}
              onChange={(e) => {
                setValues((v) => withText(v, e.target.value, classify));
                setDuplicate({ kind: "new" });
              }}
              className="text-sm"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Mode</span>
              <Segmented<Mode>
                label="Mode"
                value={values.mode}
                onChange={(mode) => setValues((v) => withMode(v, mode))}
                options={[
                  { value: "live", label: MODE_LABELS.live },
                  { value: "daily", label: MODE_LABELS.daily },
                ]}
              />
            </div>
            <FormField
              id="wf-category"
              label="Catégorie"
              error={errors.categoryId}
              hint={
                suggested
                  ? `Proposée d'après le texte (confiance ${Math.round(values.confidence! * 100)} %), modifiable.`
                  : undefined
              }
            >
              <select
                id="wf-category"
                value={values.categoryId}
                aria-invalid={Boolean(errors.categoryId) || undefined}
                onChange={(e) => setValues((v) => withCategory(v, e.target.value))}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-13 text-foreground aria-invalid:border-danger"
              >
                <option value="">À catégoriser</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {values.text.trim() && !values.categoryId && !errors.categoryId ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              À catégoriser : aucune catégorie n&apos;a pu être proposée avec assez de confiance.
            </p>
          ) : null}

          <WordingFormFields values={values} update={update} errors={errors} data={data} />

          {duplicate.kind !== "new" ? (
            <div
              role="alert"
              className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-13 text-warning"
            >
              {duplicate.kind === "exact"
                ? "Doublon exact : cette publication est déjà dans la bibliothèque."
                : `Très proche d'une publication existante (${Math.round(duplicate.similarity * 100)} % de passages communs).`}
              {match ? (
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  « {excerptOf(match.text)} »
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={busy} disabled={duplicate.kind === "exact"}>
              {duplicate.kind === "near" ? "Enregistrer quand même" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
