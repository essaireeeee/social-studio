import { DemoPanel } from "./DemoPanel";
import { ExportPanel } from "./ExportPanel";
import { ImportJsonPanel } from "./ImportJsonPanel";
import { ResetPanel } from "./ResetPanel";
import { RestorePanel } from "./RestorePanel";
import { LargeTitle } from "@/components/layout/ScreenTitle";

/** Paramètres > Gestion des données (section 16.3). */
export function DataPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Gestion des données</LargeTitle>
        <p className="text-13 text-muted-foreground">
          Les données vivent dans ce navigateur, avec une copie automatique dans data/hexagone-studio.json.
          Aucune clé API n&apos;est jamais exportée.
        </p>
      </header>
      <ExportPanel />
      <ImportJsonPanel />
      <RestorePanel />
      <DemoPanel />
      <ResetPanel />
    </div>
  );
}
