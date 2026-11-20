"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveUser, useRepository } from "@/hooks/useRepository";
import type { Mode } from "@/types/domain";
import { CompareView } from "./CompareView";
import { ProfilePanel } from "./ProfilePanel";
import { RulesSection } from "./RulesSection";

type Tab = Mode | "compare";

/** Écran ADN éditorial (section 8.9) : profils LIVE et DAILY, comparaison, règles. */
export function EditorialPage() {
  const repository = useRepository();
  const user = useActiveUser();
  const [tab, setTab] = useState<Tab>("live");
  const [compareMode, setCompareMode] = useState<Mode>("live");

  const openCompare = (mode: Mode) => {
    setCompareMode(mode);
    setTab("compare");
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">ADN éditorial</h1>
          <p className="max-w-2xl text-13 text-muted-foreground">
            Style mesuré sur les publications réelles de la bibliothèque, analysé séparément pour
            LIVE SHOW et DAILY & MEDIA. Les exemples fictifs sont exclus sauf demande explicite.
          </p>
        </div>
        {user ? (
          <Badge
            variant={user.role === "admin" ? "success" : "neutral"}
            className="self-start sm:self-auto"
          >
            {user.name} · {user.role === "admin" ? "Administrateur" : "CM"}
          </Badge>
        ) : null}
      </header>

      {!repository ? (
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" aria-hidden />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList aria-label="Profils de style">
              <TabsTrigger value="live">
                <span className="size-2 rounded-full bg-live" aria-hidden="true" />
                LIVE SHOW
              </TabsTrigger>
              <TabsTrigger value="daily">
                <span className="size-2 rounded-full bg-daily" aria-hidden="true" />
                DAILY & MEDIA
              </TabsTrigger>
              <TabsTrigger value="compare">Comparer</TabsTrigger>
            </TabsList>
            <TabsContent value="live">
              <ProfilePanel
                repository={repository}
                mode="live"
                onCompare={() => openCompare("live")}
              />
            </TabsContent>
            <TabsContent value="daily">
              <ProfilePanel
                repository={repository}
                mode="daily"
                onCompare={() => openCompare("daily")}
              />
            </TabsContent>
            <TabsContent value="compare">
              <CompareView
                key={compareMode}
                repository={repository}
                user={user}
                initialMode={compareMode}
              />
            </TabsContent>
          </Tabs>

          <RulesSection repository={repository} user={user} />
        </>
      )}
    </main>
  );
}
