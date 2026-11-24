"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { CategoryPills } from "@/components/forms/CategoryPills";
import { CtaPicker } from "@/components/forms/CtaPicker";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { HashtagPicker } from "@/components/forms/HashtagPicker";
import { SignaturePicker } from "@/components/forms/SignaturePicker";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { useStudioActions } from "@/hooks/useStudioActions";
import type { StudioData } from "@/hooks/useStudioData";
import { getCategory } from "@/lib/categories/registry";
import { TICKETING_CTA } from "@/lib/generation/context-loader";
import { eventLabelOf, findEvent } from "@/lib/generation/native/context";
import { renderSignature, signatureValues } from "@/lib/generation/signature";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";
import {
  hashtagIdsOf,
  resetDraft,
  setEventField,
  setField,
  signatureIdOf,
  signaturesFor,
} from "@/lib/studio/draft";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import { chooseCategory } from "./choose-category";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Colonne 1 : le brief (section 13.3). */
export function BriefColumn({ data }: { data: StudioData }) {
  const mode = useStudioStore((s) => s.mode);
  const draft = useStudioStore((s) => s.drafts[s.mode]);
  const updateDraft = useStudioStore((s) => s.updateDraft);
  const errors = useStudioSession((s) => s.errors);
  const generating = useStudioSession((s) => s.generating);
  const { generate, ready } = useStudioActions();

  const category = getCategory(draft.categoryId ?? "");
  const current = category?.mode === mode ? category : undefined;
  const liveSession = mode === "live" ? data.session : null;

  // Événement : celui du brief, sinon celui de la Session Live.
  const eventValue = typeof draft.fields.event === "string" ? draft.fields.event : "";
  const event =
    (eventValue ? findEvent(eventValue, data.events) : undefined) ??
    (liveSession?.eventId ? data.events.find((e) => e.id === liveSession.eventId) : undefined);
  const priorityIds = event?.fightCard.flatMap((f) => [f.fighterAId, f.fighterBId]) ?? [];
  const nameOf = (id: string) => {
    const f = data.fighters.find((x) => x.id === id);
    return f ? `${f.firstName} ${f.lastName}`.trim() : undefined;
  };
  const fightCard =
    event?.fightCard
      .map((f) => [nameOf(f.fighterAId), nameOf(f.fighterBId)])
      .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]))
      .map(([a, b]) => `${a} vs ${b}`) ?? [];

  const signatures = signaturesFor(data.signatures, mode);
  const signatureId = signatureIdOf(draft, data.signatures, mode);
  const signature = signatures.find((s) => s.id === signatureId);
  const rendered = signature
    ? renderSignature(
        signature,
        signatureValues({ event, liveSession: liveSession ?? undefined, fields: draft.fields }),
        event?.confirmedSchedule === true,
      )
    : undefined;

  const ctas = [
    ...new Set(
      (data.profile?.ctas.top ?? [])
        .filter((c) => !c.categoryId || c.categoryId === current?.id)
        .map((c) => c.text)
        .filter((text) => current?.ticketingCta !== false || !TICKETING_CTA.test(text)),
    ),
  ].slice(0, 5);

  const clearError = (key: string) => {
    if (!errors[key]) return;
    const { [key]: _removed, ...rest } = errors;
    useStudioSession.getState().patch({ errors: rest });
  };

  const choose = (categoryId: string) => chooseCategory(categoryId, liveSession, data.events);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col gap-5 p-4">
        <Section title="Plateforme principale">
          <Segmented
            label="Plateforme principale"
            value={draft.platform}
            options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_RULES[p].label }))}
            onChange={(platform) => updateDraft((d) => ({ ...d, platform }))}
          />
        </Section>

        <Section title="Catégorie">
          <CategoryPills
            mode={mode}
            value={current?.id}
            error={errors.category}
            onSelect={choose}
          />
        </Section>

        {current ? (
          <>
            <Section title={`Brief · ${current.label}`}>
              {liveSession ? (
                <p className="text-xs text-muted-foreground">
                  Contexte de la Session Live :{" "}
                  {eventLabelOf(liveSession.eventName, liveSession.eventNumber)}
                  {liveSession.city ? ` · ${liveSession.city}` : ""}
                </p>
              ) : null}
              <DynamicForm
                category={current}
                fields={draft.fields}
                errors={errors}
                ctx={{
                  settings: data.settings,
                  fighters: data.fighters,
                  events: data.events,
                  priorityIds,
                  fightCard,
                }}
                onChange={(key, value) => {
                  updateDraft((d) =>
                    key === "event"
                      ? setEventField(d, value, data.events)
                      : setField(d, key, value),
                  );
                  clearError(key);
                }}
              />
            </Section>

            <Section title="Hashtags">
              <HashtagPicker
                groups={data.groups}
                selected={hashtagIdsOf(draft, data.allGroups, mode)}
                onChange={(hashtagIds) => updateDraft((d) => ({ ...d, hashtagIds }))}
              />
            </Section>

            <Section title="Signature">
              <SignaturePicker
                signatures={signatures}
                value={signatureId}
                missing={rendered && !rendered.text ? rendered.missing : []}
                needsConfirmedSchedule={Boolean(
                  rendered && !rendered.text && rendered.needsConfirmedSchedule,
                )}
                onChange={(id) => updateDraft((d) => ({ ...d, signatureId: id }))}
              />
            </Section>

            <Section title="Appel à l'action">
              <CtaPicker
                suggestions={ctas}
                value={draft.cta}
                onChange={(cta) => updateDraft((d) => ({ ...d, cta }))}
              />
            </Section>

            {mode === "daily" ? (
              <Section title="Consigne particulière">
                <Textarea
                  id="field-freeInstruction"
                  aria-label="Consigne particulière"
                  autoResize
                  rows={2}
                  placeholder="Facultatif : un angle, une précision de ton"
                  value={draft.freeInstruction ?? ""}
                  onChange={(e) =>
                    updateDraft((d) => ({ ...d, freeInstruction: e.target.value || undefined }))
                  }
                />
              </Section>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-border bg-background p-3">
        <Button
          size="touch"
          className="h-13 w-full text-sm font-semibold tracking-wide lg:h-11"
          disabled={!current || !ready}
          loading={generating}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          onClick={() => void generate()}
        >
          {generating ? "Génération…" : "GÉNÉRER LES WORDINGS"}
          {generating ? null : (
            <Kbd className="hidden border-white/30 bg-white/15 text-inherit lg:inline-flex">
              Ctrl ↵
            </Kbd>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onClick={() => {
            updateDraft(resetDraft);
            useStudioSession.getState().patch({ errors: {} });
          }}
        >
          <RotateCcw aria-hidden="true" />
          Réinitialiser le brief
        </Button>
      </div>
    </div>
  );
}
