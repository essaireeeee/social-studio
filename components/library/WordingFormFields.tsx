"use client";

import { MultiFighterField } from "@/components/forms/fields/MultiFighterField";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryData } from "@/hooks/useLibraryData";
import { eventLabelOf } from "@/lib/generation/native/context";
import type { FormErrors, WordingFormValues } from "@/lib/library/form";
import { STATUS_LABELS } from "@/lib/library/labels";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";
import type { Platform, Wording } from "@/types/domain";

const selectClass =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-13 text-foreground";

interface WordingFormFieldsProps {
  values: WordingFormValues;
  update: (patch: Partial<WordingFormValues>) => void;
  errors: FormErrors;
  data: LibraryData;
}

/** Champs complémentaires de la fiche : tous facultatifs. */
export function WordingFormFields({ values, update, errors, data }: WordingFormFieldsProps) {
  const described = (id: string, error?: string) => (error ? `${id}-error` : `${id}-hint`);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField id="wf-fighters" label="Combattants" error={errors.fighters}>
          <MultiFighterField
            id="wf-fighters"
            label="Combattants"
            value={values.fighters}
            fighters={data.fighters}
            invalid={Boolean(errors.fighters)}
            describedBy={errors.fighters ? "wf-fighters-error" : undefined}
            onChange={(next) => update({ fighters: next ?? [] })}
          />
        </FormField>
      </div>
      <FormField id="wf-event" label="Événement">
        <select
          id="wf-event"
          className={selectClass}
          value={values.eventId}
          onChange={(e) => update({ eventId: e.target.value })}
        >
          <option value="">Aucun</option>
          {data.events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {eventLabelOf(ev.name, ev.number)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="wf-date" label="Date de publication" error={errors.date}>
        <Input
          id="wf-date"
          type="date"
          value={values.date}
          aria-invalid={Boolean(errors.date) || undefined}
          onChange={(e) => update({ date: e.target.value })}
        />
      </FormField>
      <FormField id="wf-platform" label="Plateforme">
        <select
          id="wf-platform"
          className={selectClass}
          value={values.platform}
          onChange={(e) => update({ platform: e.target.value as Platform })}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_RULES[p].label}
            </option>
          ))}
        </select>
      </FormField>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Statut</span>
        <Segmented<Wording["status"]>
          label="Statut"
          value={values.status}
          onChange={(status) => update({ status })}
          options={[
            { value: "published", label: STATUS_LABELS.published },
            { value: "validated", label: STATUS_LABELS.validated },
          ]}
        />
      </div>
      <div className="sm:col-span-2">
        <FormField
          id="wf-url"
          label="Lien Instagram"
          hint="Stocké tel quel, jamais consulté par l'application."
          error={errors.instagramUrl}
        >
          <Input
            id="wf-url"
            type="url"
            placeholder="https://"
            value={values.instagramUrl}
            aria-invalid={Boolean(errors.instagramUrl) || undefined}
            aria-describedby={described("wf-url", errors.instagramUrl)}
            onChange={(e) => update({ instagramUrl: e.target.value })}
          />
        </FormField>
      </div>
      <FormField
        id="wf-hashtags"
        label="Hashtags"
        hint={values.hashtagsTouched ? "Modifiés à la main." : "Extraits du texte, modifiables."}
      >
        <Input
          id="wf-hashtags"
          value={values.hashtags}
          aria-describedby="wf-hashtags-hint"
          onChange={(e) => update({ hashtags: e.target.value, hashtagsTouched: true })}
        />
      </FormField>
      <FormField
        id="wf-cta"
        label="Appel à l'action"
        hint={
          values.ctaTouched
            ? "Modifié à la main."
            : values.cta
              ? "Détecté dans le texte, modifiable."
              : "Aucun appel à l'action détecté."
        }
      >
        <Input
          id="wf-cta"
          value={values.cta}
          aria-describedby="wf-cta-hint"
          onChange={(e) => update({ cta: e.target.value, ctaTouched: true })}
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id="wf-tags" label="Tags" hint="Séparés par des virgules.">
          <Input
            id="wf-tags"
            value={values.tags}
            aria-describedby="wf-tags-hint"
            onChange={(e) => update({ tags: e.target.value })}
          />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField id="wf-notes" label="Commentaires internes">
          <Textarea
            id="wf-notes"
            rows={2}
            autoResize
            value={values.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
