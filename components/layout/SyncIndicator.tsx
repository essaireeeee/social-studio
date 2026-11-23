"use client";

import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/useNow";
import { formatRelative } from "@/lib/format";
import { useDataStore } from "@/stores/data.store";

/** État de la sauvegarde dans le fichier local (section 12.2) : « Sauvegardé · il y a 3 s ». */
export function SyncIndicator() {
  const sync = useDataStore((state) => state.fileSync);
  const now = useNow();

  let icon = <Cloud className="size-3.5" aria-hidden="true" />;
  let text = "Sauvegarde locale";
  let tone = "text-muted-foreground";
  if (sync.status === "pending" || sync.status === "saving") {
    icon = <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />;
    text = "Enregistrement…";
  } else if (sync.status === "saved" && sync.lastSavedAt) {
    text = now ? `Sauvegardé · ${formatRelative(sync.lastSavedAt, now)}` : "Sauvegardé";
  } else if (sync.status === "error") {
    icon = <CloudOff className="size-3.5" aria-hidden="true" />;
    text = "Sauvegarde en erreur";
    tone = "text-danger";
  } else if (sync.status === "disabled") {
    icon = <CloudOff className="size-3.5" aria-hidden="true" />;
    text = "Sauvegarde fichier désactivée";
  }

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
