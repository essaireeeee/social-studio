"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDirectoryData } from "@/hooks/useDirectoryData";
import { useNow } from "@/hooks/useNow";
import { nextEvent } from "@/lib/events/query";
import { eventLabelOf } from "@/lib/generation/native/context";
import { GroupList } from "./GroupList";
import { SignatureList } from "./SignatureList";

/** Écran Hashtags & signatures (section 15.3). */
export function HashtagsPage() {
  const data = useDirectoryData();
  const now = useNow(60_000);
  const [chosen, setChosen] = useState<string>();
  const events = data?.events ?? [];
  // Aperçu : événement choisi, sinon celui de la Session Live, sinon le prochain.
  const fallback =
    events.find((e) => e.id === data?.session?.eventId) ??
    (now ? nextEvent(events, now.toISOString().slice(0, 10)) : undefined) ??
    events[0];
  const previewEvent = events.find((e) => e.id === chosen) ?? fallback;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hashtags & signatures</h1>
        <p className="max-w-2xl text-13 text-muted-foreground">
          Les groupes et signatures actifs sont proposés dans le Studio, dans cet ordre.
        </p>
      </header>
      {!data ? (
        <p className="py-10 text-center text-13 text-muted-foreground">Chargement…</p>
      ) : (
        <Tabs defaultValue="groups">
          <TabsList aria-label="Sections">
            <TabsTrigger value="groups">Groupes de hashtags ({data.groups.length})</TabsTrigger>
            <TabsTrigger value="signatures">Signatures ({data.signatures.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="groups">
            <GroupList groups={data.groups} />
          </TabsContent>
          <TabsContent value="signatures" className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:max-w-sm">
              Aperçu avec l&apos;événement
              <select
                value={previewEvent?.id ?? ""}
                disabled={events.length === 0}
                onChange={(e) => setChosen(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground"
              >
                {events.length === 0 ? <option value="">Aucun événement</option> : null}
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {eventLabelOf(e.name, e.number)}
                    {e.id === data.session?.eventId ? " (Session Live)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <SignatureList signatures={data.signatures} previewEvent={previewEvent} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
