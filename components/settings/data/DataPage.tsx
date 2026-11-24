import { DemoPanel } from "./DemoPanel";
import { ExportPanel } from "./ExportPanel";
import { ImportJsonPanel } from "./ImportJsonPanel";
import { ResetPanel } from "./ResetPanel";
import { RestorePanel } from "./RestorePanel";

/** Paramètres > Gestion des données (section 16.3). */
export function DataPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Gestion des données</h1>
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
