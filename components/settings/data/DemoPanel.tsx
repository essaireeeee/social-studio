"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { deleteDemoWordings } from "@/lib/data/maintenance";
import { plural } from "@/lib/format";
import { toast } from "@/stores/toast.store";
import { DataBlock } from "./DataBlock";

/** Suppression des exemples fictifs créés au premier lancement. */
export function DemoPanel() {
  const repository = useRepository();
  const [confirming, setConfirming] = useState(false);
  const count = useLiveQuery(
    async () => (repository ? (await repository.wordings.list({ filter: (w) => w.isDemo })).length : undefined),
    [repository],
  );
  return (
    <DataBlock
      title="Exemples fictifs"
      description="Les six publications de démonstration ne servent jamais de référence de style. Supprimez-les quand la bibliothèque contient vos publications officielles."
    >
      <p className="text-13" data-testid="demo-count">
        {count === undefined ? "…" : count === 0 ? "Aucun exemple fictif." : plural(count, "exemple fictif", "exemples fictifs")}
      </p>
      <Button variant="secondary" className="self-start" disabled={!count} onClick={() => setConfirming(true)}>
        Supprimer les exemples fictifs
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Supprimer les exemples fictifs ?"
        description="Les publications de démonstration seront retirées de la bibliothèque. Vos publications ne sont pas touchées."
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (repository)
            void deleteDemoWordings(repository).then((n) => toast(`${plural(n, "exemple supprimé", "exemples supprimés")}`, "success"));
        }}
        onClose={() => setConfirming(false)}
      />
    </DataBlock>
  );
}
