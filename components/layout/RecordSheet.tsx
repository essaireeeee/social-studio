"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getCategory } from "@/lib/categories/registry";
import { formatDate, isStale } from "@/lib/format";
import { eventLabelOf } from "@/lib/generation/native/context";
import type { PaletteRecord } from "@/lib/shell/commands";
import { MODE_LABELS } from "@/lib/shell/mode";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import type { Fighter, HexEvent, Wording } from "@/types/domain";

export type SheetRecord = PaletteRecord;

const DEMO_BADGE = "EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-13">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Updated({ at }: { at: string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      Mise à jour le {formatDate(at)}
      {isStale(at) ? <Badge variant="warning">À vérifier</Badge> : null}
    </p>
  );
}

function WordingBody({ wording }: { wording: Wording }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <SheetTitle>{getCategory(wording.categoryId)?.label ?? "Publication"}</SheetTitle>
        <SheetDescription>
          {MODE_LABELS[wording.mode]} · {PLATFORM_RULES[wording.platform].label} ·{" "}
          {wording.date
            ? `publiée le ${formatDate(wording.date)}`
            : `ajoutée le ${formatDate(wording.createdAt)}`}
        </SheetDescription>
      </div>
      {wording.isDemo ? (
        <Badge variant="warning" className="self-start whitespace-normal">
          {DEMO_BADGE}
        </Badge>
      ) : null}
      <p className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap">
        {wording.text}
      </p>
    </>
  );
}

function FighterBody({ fighter }: { fighter: Fighter }) {
  const record = fighter.record;
  return (
    <>
      <div className="flex flex-col gap-1">
        <SheetTitle>
          {fighter.firstName} {fighter.lastName}
        </SheetTitle>
        <SheetDescription>
          {fighter.nickname ? `« ${fighter.nickname} »` : "Fiche combattant"}
        </SheetDescription>
      </div>
      <Updated at={fighter.updatedAt} />
      <dl className="flex flex-col gap-1.5">
        {fighter.weightClass ? <Row label="Catégorie">{fighter.weightClass}</Row> : null}
        {fighter.club ? <Row label="Club">{fighter.club}</Row> : null}
        {fighter.nationality ? <Row label="Nationalité">{fighter.nationality}</Row> : null}
        {record ? (
          <Row label="Palmarès">
            {record.wins}-{record.losses}-{record.draws} (au {formatDate(record.asOf)})
          </Row>
        ) : null}
      </dl>
      {fighter.bio ? <p className="text-13 leading-relaxed">{fighter.bio}</p> : null}
    </>
  );
}

function EventBody({ event, onStartSession }: { event: HexEvent; onStartSession?: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <SheetTitle>{eventLabelOf(event.name, event.number)}</SheetTitle>
        <SheetDescription>
          {event.date ? formatDate(event.date) : "Date non renseignée"}
        </SheetDescription>
      </div>
      <Updated at={event.updatedAt} />
      <dl className="flex flex-col gap-1.5">
        {event.venue ? <Row label="Salle">{event.venue}</Row> : null}
        {event.city ? <Row label="Ville">{event.city}</Row> : null}
        {event.broadcasters.length > 0 ? (
          <Row label="Diffusion">{event.broadcasters.map((b) => b.name).join(", ")}</Row>
        ) : null}
        <Row label="Horaires">{event.confirmedSchedule ? "Confirmés" : "Non confirmés"}</Row>
      </dl>
      {onStartSession ? (
        <Button className="self-start" onClick={onStartSession}>
          Démarrer une Session Live avec cet événement
        </Button>
      ) : null}
    </>
  );
}

interface RecordSheetProps {
  item: SheetRecord | null;
  onClose: () => void;
  /** Fourni s'il n'y a pas de session active : démarre une session sur l'événement affiché. */
  onStartSession?: (event: HexEvent) => void;
}

/** Fiche en lecture seule d'un résultat de recherche (wording, combattant, événement). */
export function RecordSheet({ item, onClose, onStartSession }: RecordSheetProps) {
  return (
    <Sheet open={item !== null} onOpenChange={(open) => !open && onClose()}>
      {item ? (
        <SheetContent>
          {item.kind === "wording" ? <WordingBody wording={item.record} /> : null}
          {item.kind === "fighter" ? <FighterBody fighter={item.record} /> : null}
          {item.kind === "event" ? (
            <EventBody
              event={item.record}
              onStartSession={onStartSession ? () => onStartSession(item.record) : undefined}
            />
          ) : null}
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
