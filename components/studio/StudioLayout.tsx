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
    <>
      {/* Sous 1 024 px, l'en-tête visuel disparaît ; le titre reste pour la structure des titres. */}
      <h2 className="sr-only lg:hidden">{title}</h2>
      <div className="sticky top-0 z-20 hidden h-11 shrink-0 items-center justify-between border-b-[0.5px] border-separator bg-surface px-4 lg:flex">
        <h2 className="text-footnote font-semibold tracking-wide text-muted-foreground">{title}</h2>
        {children}
      </div>
    </>
  );
}

interface StudioLayoutProps {
  brief: ReactNode;
  wording: ReactNode;
  preview: ReactNode;
  onHelp: () => void;
}

/**
 * Mise en page du Studio (sections 13.1 et 13.2 V1, 5.8 V2). ≥ 1 280 px : trois colonnes
 * 32 / 40 / 28, chacune une surface arrondie sur fond groupé, avec son défilement.
 * 1 024 à 1 279 px : aperçu en panneau escamotable. < 1 024 px : trois onglets présentés en
 * contrôle segmenté sous la barre de navigation, pas de colonnes réduites.
 */
export function StudioLayout({ brief, wording, preview, onHelp }: StudioLayoutProps) {
  const tab = useStudioStore((s) => s.mobileTab);
  const badge = useStudioStore((s) => s.resultsBadge);
  const panelOpen = useStudioStore((s) => s.previewPanelOpen);
  const { setMobileTab, setPreviewPanelOpen } = useStudioStore.getState();

  const column = "flex min-h-0 flex-col lg:overflow-y-auto lg:rounded-xl lg:bg-surface lg:squircle";
  return (
    <div className="flex flex-col lg:h-[calc(100dvh-52px-var(--session-bar,0px))]">
      <div className="sticky top-[calc(2.75rem+env(safe-area-inset-top)+var(--session-bar,0px))] z-20 bg-bg px-4 py-2 sm:px-6 lg:hidden">
        <div
          role="tablist"
          aria-label="Étapes du Studio"
          className="grid grid-cols-3 rounded-[9px] bg-fill p-0.5 squircle"
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
                "relative flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] text-13 accent-transition",
                tab === t.id
                  ? "bg-surface font-semibold text-foreground shadow-[0_3px_8px_rgba(0,0,0,0.12)] dark:bg-surface-3"
                  : "font-medium text-muted-foreground",
              )}
            >
              {t.label}
              {t.id === "results" && badge ? (
                <span className="size-2 rounded-full bg-mode" aria-label="nouvelle génération" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-3 lg:p-3 xl:grid-cols-[minmax(0,32fr)_minmax(0,40fr)_minmax(0,28fr)]">
        <section
          id="studio-panel-brief"
          role="tabpanel"
          aria-label="Brief"
          className={cn(column, "lg:flex", tab !== "brief" && "hidden")}
        >
          <ColumnHeader title="BRIEF" />
          {brief}
        </section>
        <section
          id="studio-panel-results"
          role="tabpanel"
          aria-label="Wording Studio"
          className={cn(column, "lg:flex", tab !== "results" && "hidden")}
        >
          <ColumnHeader title="WORDING STUDIO">
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={panelOpen}
                aria-controls="studio-panel-preview"
                onClick={() => setPreviewPanelOpen(!panelOpen)}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-fill hover:text-foreground xl:hidden"
              >
                <Eye className="size-3.5" aria-hidden="true" />
                {panelOpen ? "Masquer l'aperçu" : "Aperçu"}
              </button>
              <Tooltip content="Raccourcis clavier (?)" side="bottom">
                <button
                  type="button"
                  onClick={onHelp}
                  aria-label="Raccourcis clavier"
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-fill hover:text-foreground"
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
              ? "lg:fixed lg:top-[calc(52px+var(--session-bar,0px)+0.75rem)] lg:right-3 lg:bottom-3 lg:z-30 lg:flex lg:w-[380px] lg:shadow-float"
              : "lg:hidden",
            "xl:static xl:z-auto xl:flex xl:w-auto xl:shadow-none",
          )}
        >
          <ColumnHeader title="LIVE PREVIEW">
            <button
              type="button"
              onClick={() => setPreviewPanelOpen(false)}
              aria-controls="studio-panel-preview"
              className="flex h-7 cursor-pointer items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-fill hover:text-foreground xl:hidden"
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
