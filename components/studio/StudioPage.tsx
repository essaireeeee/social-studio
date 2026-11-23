"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PreviewColumn } from "@/components/preview/PreviewColumn";
import { useMode } from "@/hooks/useMode";
import { useStudioData } from "@/hooks/useStudioData";
import { useStudioShortcuts } from "@/hooks/useStudioShortcuts";
import { useStudioSession } from "@/stores/studio-session.store";
import { BriefColumn } from "./BriefColumn";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { useStudioContext } from "./StudioContext";
import { StudioLayout } from "./StudioLayout";
import { WordingColumn } from "./WordingColumn";

/** Le Social Studio (section 13). `?mode=live|daily` ouvre le Studio dans ce mode. */
export function StudioPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { mode, setMode } = useMode();
  const data = useStudioData(mode);
  const { hydrated } = useStudioContext();
  const [help, setHelp] = useState(false);
  const openHelp = useCallback(() => setHelp(true), []);
  useStudioShortcuts(data?.settings, data?.session, openHelp);

  const requested = params.get("mode");
  useEffect(() => {
    if (requested !== "live" && requested !== "daily") return;
    void setMode(requested);
    router.replace("/studio", { scroll: false });
  }, [requested, setMode, router]);

  // Références, messages et déclinaisons appartiennent à un mode : jamais affichés dans l'autre.
  useEffect(() => {
    useStudioSession.getState().patch({
      references: [],
      excludedIds: [],
      notice: undefined,
      signatureIssue: undefined,
      declination: undefined,
      errors: {},
    });
  }, [mode]);

  if (!data || !hydrated) {
    return (
      <div
        className="grid gap-4 p-4 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Chargement du Studio"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">Social Studio</h1>
      <StudioLayout
        brief={<BriefColumn data={data} />}
        wording={<WordingColumn data={data} />}
        preview={<PreviewColumn data={data} />}
        onHelp={openHelp}
      />
      <ShortcutsDialog
        open={help}
        copyShortcut={data.settings.copyShortcut}
        onOpenChange={setHelp}
      />
    </>
  );
}
