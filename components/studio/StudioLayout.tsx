"use client";

import { Eye, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useStudioStore, type MobileTab } from "@/stores/studio.store";

const TABS: { id: MobileTab; label: string }[] = [
  { id: "brief", label: "1. Saisie" },
  { id: "results", label: "2. Résultats" },
  { id: "preview", label: "3. Aperçu" },
];

function ColumnHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 hidden h-10 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 lg:flex">
      <h2 className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

interface StudioLayoutProps {
  brief: ReactNode;
  wording: ReactNode;
  preview: ReactNode;
  onHelp: () => void;
}

/**
 * Mise en page du Studio (sections 13.1 et 13.2). ≥ 1 280 px : trois colonnes 32 / 40 / 28,
 * chacune avec son défilement. 1 024 à 1 279 px : aperçu en panneau escamotable.
 * < 1 024 px : trois onglets, pas de colonnes réduites.
 */
export function StudioLayout({ brief, wording, preview, onHelp }: StudioLayoutProps) {
  const tab = useStudioStore((s) => s.mobileTab);
  const badge = useStudioStore((s) => s.resultsBadge);
  const panelOpen = useStudioStore((s) => s.previewPanelOpen);
  const { setMobileTab, setPreviewPanelOpen } = useStudioStore.getState();

  const column = "flex min-h-0 flex-col lg:overflow-y-auto";
  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.25rem-var(--session-bar,0px))]">
      <div
        role="tablist"
        aria-label="Étapes du Studio"
        className="sticky top-[calc(3.25rem+var(--session-bar,0px))] z-20 grid grid-cols-3 border-b border-border bg-background lg:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`studio-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`studio-panel-${t.id}`}
            onClick={() => setMobileTab(t.id)}
            className={cn(
              "relative flex h-11 cursor-pointer items-center justify-center gap-1.5 border-b-2 text-13 font-medium accent-transition",
              tab === t.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t.label}
            {t.id === "results" && badge ? (
              <span className="size-2 rounded-full bg-accent" aria-label="nouvelle génération" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[40%_60%] xl:grid-cols-[32%_40%_28%]">
        <section
          id="studio-panel-brief"
          role="tabpanel"
          aria-label="Brief"
          className={cn(
            column,
            "lg:flex lg:border-r lg:border-border",
            tab !== "brief" && "hidden",
          )}
        >
          <ColumnHeader title="BRIEF" />
          {brief}
        </section>
        <section
          id="studio-panel-results"
          role="tabpanel"
          aria-label="Wording Studio"
          className={cn(
            column,
            "lg:flex xl:border-r xl:border-border",
            tab !== "results" && "hidden",
          )}
        >
          <ColumnHeader title="WORDING STUDIO">
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={panelOpen}
                aria-controls="studio-panel-preview"
                onClick={() => setPreviewPanelOpen(!panelOpen)}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-subtle hover:text-foreground xl:hidden"
              >
                <Eye className="size-3.5" aria-hidden="true" />
                {panelOpen ? "Masquer l'aperçu" : "Aperçu"}
              </button>
              <Tooltip content="Raccourcis clavier (?)" side="bottom">
                <button
                  type="button"
                  onClick={onHelp}
                  aria-label="Raccourcis clavier"
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-subtle hover:text-foreground"
                >
                  <HelpCircle className="size-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </span>
          </ColumnHeader>
          {wording}
        </section>
        <section
          id="studio-panel-preview"
          role="tabpanel"
          aria-label="Aperçu"
          className={cn(
            column,
            tab !== "preview" && "hidden",
            panelOpen
              ? "lg:fixed lg:top-[calc(3.25rem+var(--session-bar,0px))] lg:right-0 lg:bottom-0 lg:z-30 lg:flex lg:w-[380px] lg:border-l lg:border-border lg:bg-background lg:shadow-2xl"
              : "lg:hidden",
            "xl:static xl:z-auto xl:flex xl:w-auto xl:border-l-0 xl:shadow-none",
          )}
        >
          <ColumnHeader title="LIVE PREVIEW">
            <button
              type="button"
              onClick={() => setPreviewPanelOpen(false)}
              aria-controls="studio-panel-preview"
              className="flex h-7 cursor-pointer items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-subtle hover:text-foreground xl:hidden"
            >
              Fermer l&apos;aperçu
            </button>
          </ColumnHeader>
          {preview}
        </section>
      </div>
    </div>
  );
}
