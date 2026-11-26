"use client";

import { UpdatedNote } from "@/components/directory/UpdatedNote";
import { formatDate } from "@/lib/format";
import { eventLabelOf } from "@/lib/generation/native/context";
import type { EventTimeline } from "@/lib/events/query";
import { cn } from "@/lib/utils";
import type { HexEvent } from "@/types/domain";

function Group({
  title,
  events,
  selectedId,
  onSelect,
}: {
  title: string;
  events: readonly HexEvent[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-1.5" aria-label={title}>
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title} ({events.length})
      </h2>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {events.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                aria-current={e.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(e.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left",
                  e.id === selectedId
                    ? "border-accent bg-accent/10"
                    : "border-transparent hover:bg-fill",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-13 font-medium">
                    {eventLabelOf(e.name, e.number)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {e.date ? formatDate(e.date) : "Date à définir"}
                    {e.city ? ` · ${e.city}` : ""}
                  </span>
                </span>
                <UpdatedNote at={e.updatedAt} compact />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Liste chronologique : à venir, puis passés (section 15.2). */
export function EventList({
  timeline,
  selectedId,
  onSelect,
}: {
  timeline: EventTimeline;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Group
        title="À venir"
        events={timeline.upcoming}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <Group title="Passés" events={timeline.past} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}
