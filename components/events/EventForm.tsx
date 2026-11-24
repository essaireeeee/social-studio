"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRepository } from "@/hooks/useRepository";
import { saveEvent } from "@/lib/events/actions";
import {
  eventForm,
  eventFormErrors,
  scheduleWarning,
  type EventFormErrors,
} from "@/lib/events/form";
import { toast } from "@/stores/toast.store";
import type { Fighter, HexEvent } from "@/types/domain";
import { BroadcastersEditor } from "./BroadcastersEditor";
import { EventInfoFields } from "./EventInfoFields";
import { FightCardBuilder } from "./FightCardBuilder";
import { LinksEditor } from "./LinksEditor";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface EventFormProps {
  event?: HexEvent;
  fighters: readonly Fighter[];
  onSaved: (event: HexEvent) => void;
}

/** Fiche événement éditable (section 15.2). */
export function EventForm({ event, fighters, onSaved }: EventFormProps) {
  const repository = useRepository();
  const [values, setValues] = useState(() => eventForm(event));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [busy, setBusy] = useState(false);
  const update = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  const submit = async () => {
    if (!repository) return;
    const found = eventFormErrors(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast("Certains champs sont à corriger.", "danger");
      const first = Object.keys(found)[0]!;
      document.getElementById(`event-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const saved = await saveEvent(repository, values, { existing: event });
      toast(event ? "Événement mis à jour" : "Événement créé", "success");
      onSaved(saved);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-6"
      aria-label={event ? "Fiche événement" : "Nouvel événement"}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Block title="Informations">
        <EventInfoFields values={values} errors={errors} update={update} />
      </Block>
      <Block title="Diffusion">
        <BroadcastersEditor
          rows={values.broadcasters}
          confirmed={values.confirmedSchedule}
          warning={scheduleWarning(values)}
          errors={errors}
          onChange={(broadcasters) => update({ broadcasters })}
          onConfirmed={(confirmedSchedule) => update({ confirmedSchedule })}
        />
      </Block>
      <Block title="Fight card">
        <FightCardBuilder
          card={values.fightCard}
          fighters={fighters}
          errors={errors}
          onChange={(fightCard) => update({ fightCard })}
        />
      </Block>
      <Block title="Liens">
        <LinksEditor rows={values.links} errors={errors} onChange={(links) => update({ links })} />
      </Block>
      <Block title="Notes internes">
        <Textarea
          aria-label="Notes internes"
          rows={2}
          autoResize
          value={values.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </Block>
      <Button type="submit" loading={busy} className="self-start">
        {event ? "Enregistrer l'événement" : "Créer l'événement"}
      </Button>
    </form>
  );
}
