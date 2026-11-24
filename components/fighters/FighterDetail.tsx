"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { UpdatedNote } from "@/components/directory/UpdatedNote";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DirectoryData } from "@/hooks/useDirectoryData";
import { useRepository } from "@/hooks/useRepository";
import { deleteFighter } from "@/lib/fighters/actions";
import { fighterEvents, fighterWordings } from "@/lib/fighters/query";
import { toast } from "@/stores/toast.store";
import type { Fighter } from "@/types/domain";
import { FighterEvents } from "./FighterEvents";
import { FighterForm } from "./FighterForm";
import { FighterWordings } from "./FighterWordings";

interface FighterDetailProps {
  fighter?: Fighter;
  data: DirectoryData;
  onSaved: (fighter: Fighter) => void;
  onDeleted: () => void;
}

/** Fiche, publications associées et événements d'un combattant. */
export function FighterDetail({ fighter, data, onSaved, onDeleted }: FighterDetailProps) {
  const repository = useRepository();
  const [confirming, setConfirming] = useState(false);

  if (!fighter) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Nouveau combattant</h2>
        <FighterForm events={data.events} onSaved={onSaved} />
      </div>
    );
  }

  const wordings = fighterWordings(data.wordings, fighter.id);
  const events = fighterEvents(data.events, fighter);
  const remove = async () => {
    if (!repository) return;
    try {
      await deleteFighter(repository, fighter);
      toast("Fiche supprimée", "success");
      onDeleted();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Suppression impossible.", "danger");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">
            {fighter.firstName} {fighter.lastName}
            {fighter.nickname ? (
              <span className="font-normal text-muted-foreground"> « {fighter.nickname} »</span>
            ) : null}
          </h2>
          <UpdatedNote at={fighter.updatedAt} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden="true" />
          Supprimer la fiche
        </Button>
      </header>
      <Tabs defaultValue="sheet">
        <TabsList aria-label="Sections de la fiche">
          <TabsTrigger value="sheet">Fiche</TabsTrigger>
          <TabsTrigger value="wordings" aria-label={`Publications associées (${wordings.length})`}>
            Publications<span className="hidden sm:inline">&nbsp;associées</span>
            {` (${wordings.length})`}
          </TabsTrigger>
          <TabsTrigger value="events">Événements ({events.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="sheet">
          <FighterForm
            key={`${fighter.id}-${fighter.updatedAt}`}
            fighter={fighter}
            events={data.events}
            onSaved={onSaved}
          />
        </TabsContent>
        <TabsContent value="wordings">
          <FighterWordings wordings={wordings} />
        </TabsContent>
        <TabsContent value="events">
          <FighterEvents items={events} />
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={confirming}
        title="Supprimer cette fiche ?"
        description="Les publications qui citent ce combattant gardent leur texte mais perdent le lien vers la fiche. Cette action est définitive."
        confirmLabel="Supprimer"
        onConfirm={() => void remove()}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
