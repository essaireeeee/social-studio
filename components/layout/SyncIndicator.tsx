"use client";

import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/useNow";
import { syncLabel } from "@/lib/shell/sync-label";
import { useDataStore } from "@/stores/data.store";

/** État de la sauvegarde dans le fichier local (section 12.2) : « Sauvegardé · il y a 3 s ». */
export function SyncIndicator() {
  const sync = useDataStore((state) => state.fileSync);
  const now = useNow();

  const { text, tone: kind } = syncLabel(sync, now);
  const tone = kind === "danger" ? "text-danger" : "text-muted-foreground";
  const icon =
    kind === "busy" ? (
      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
    ) : sync.status === "error" || sync.status === "disabled" ? (
      <CloudOff className="size-3.5" aria-hidden="true" />
    ) : (
      <Cloud className="size-3.5" aria-hidden="true" />
    );

  return (
    <Tooltip
      content={sync.message ?? "Copie automatique de la base dans data/hexagone-studio.json"}
      side="bottom"
    >
      <span
        tabIndex={0}
        className={`flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs whitespace-nowrap ${tone}`}
        aria-label={sync.message ? `${text}. ${sync.message}` : text}
      >
        {icon}
        <span className="hidden xl:inline" aria-hidden="true">
          {text}
        </span>
      </span>
    </Tooltip>
  );
}
