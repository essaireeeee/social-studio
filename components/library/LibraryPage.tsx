"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { copyText } from "@/components/editor/VariantActions";
import { RecordSheet } from "@/components/layout/RecordSheet";
import { Button } from "@/components/ui/button";
import { useLibraryData } from "@/hooks/useLibraryData";
import { useRepository } from "@/hooks/useRepository";
import { plural } from "@/lib/format";
import { toggleReference } from "@/lib/library/actions";
import { emptyForm, formFromWording } from "@/lib/library/form";
import {
  createLibraryIndex,
  libraryTags,
  queryLibrary,
  type LibraryFilters as Filters,
} from "@/lib/library/query";
import { useLibraryStore } from "@/stores/library.store";
import { toast } from "@/stores/toast.store";
import { useStudioStore } from "@/stores/studio.store";
import type { Wording } from "@/types/domain";
import { BulkImportModal } from "./import/BulkImportModal";
import { InstagramImportModal } from "./import/InstagramImportModal";
import { TableImportModal } from "./import/TableImportModal";
import { DeleteWordingDialog } from "./DeleteWordingDialog";
import { LibraryFilters } from "./LibraryFilters";
import { LibraryToolbar, type ImportKind } from "./LibraryToolbar";
import { WordingForm } from "./WordingForm";
import type { WordingAction } from "./WordingMenu";
import { WordingResults } from "./WordingResults";

type FormState = { kind: "create" } | { kind: "edit" | "duplicate"; wording: Wording };

const FORM_TITLES = {
  create: "Ajouter une publication",
  edit: "Modifier la publication",
  duplicate: "Dupliquer la publication",
};

/** Écran Bibliothèque « BASE WORDINGS & ADN » (section 14). */
export function LibraryPage() {
  const repository = useRepository();
  const data = useLibraryData();
  const view = useLibraryStore((s) => s.view);
  const sort = useLibraryStore((s) => s.sort);
  const mode = useStudioStore((s) => s.mode);
  const [filters, setFilters] = useState<Filters>({});
  const [text, setText] = useState("");
  const search = useDeferredValue(text);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [consulted, setConsulted] = useState<Wording | null>(null);
  const [deleting, setDeleting] = useState<Wording | null>(null);
  const [importing, setImporting] = useState<ImportKind | null>(null);

  useEffect(() => {
    void useLibraryStore.persist.rehydrate();
  }, []);

  const wordings = data?.wordings;
  const index = useMemo(() => (wordings ? createLibraryIndex(wordings) : null), [wordings]);
  const results = useMemo(
    () => (index ? queryLibrary(index, { ...filters, text: search }, sort).wordings : []),
    [index, filters, search, sort],
  );
  const tags = useMemo(() => libraryTags(wordings ?? []), [wordings]);
  const demos = wordings?.filter((w) => w.isDemo).length ?? 0;
  const activeFilters = Object.entries(filters).filter(([key, value]) =>
    key === "includeDemo" ? value === true : value !== undefined,
  ).length;

  const onAction = async (action: WordingAction, wording: Wording) => {
    if (action === "consult") return setConsulted(wording);
    if (action === "edit" || action === "duplicate") return setForm({ kind: action, wording });
    if (action === "copy") return copyText(wording.text);
    if (action === "delete") return setDeleting(wording);
    if (!repository) return;
    try {
      const updated = await toggleReference(repository, wording);
      toast(
        updated.isReference ? "Ajoutée aux références de style" : "Retirée des références de style",
        "success",
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible.", "danger");
    }
  };

  const reset = () => {
    setFilters({});
    setText("");
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque de wordings</h1>
        <p className="max-w-3xl text-13 text-muted-foreground">
          Les publications de HEXAGONE MMA. Elles nourrissent l&apos;ADN éditorial et la recherche
          de références, séparément pour LIVE SHOW et DAILY & MEDIA.
        </p>
      </header>

      <LibraryToolbar
        text={text}
        onText={setText}
        sort={sort}
        onSort={(s) => useLibraryStore.getState().setSort(s)}
        view={view}
        onView={(v) => useLibraryStore.getState().setView(v)}
        activeFilters={activeFilters}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        onAdd={() => setForm({ kind: "create" })}
        onImport={setImporting}
      />
      <LibraryFilters
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onReset={reset}
        fighters={data?.fighters ?? []}
        events={data?.events ?? []}
        tags={tags}
        open={filtersOpen}
      />

      {!data ? (
        <p className="py-10 text-center text-13 text-muted-foreground">
          Chargement de la bibliothèque…
        </p>
      ) : (
        <>
          <p
            className="text-13 text-muted-foreground"
            aria-live="polite"
            data-testid="library-count"
          >
            {plural(results.length, "publication")}
            {data.wordings.length !== results.length ? ` sur ${data.wordings.length}` : ""}
            {!filters.includeDemo && demos > 0
              ? ` · ${plural(demos, "exemple fictif masqué", "exemples fictifs masqués")}`
              : ""}
          </p>
          {results.length > 0 ? (
            <WordingResults
              wordings={results}
              view={view}
              onAction={(a, w) => void onAction(a, w)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center text-13 text-muted-foreground">
              {data.wordings.length === 0 ? (
                <p>
                  La bibliothèque est vide. Ajoutez une publication ou importez celles déjà
                  publiées.
                </p>
              ) : demos === data.wordings.length && !filters.includeDemo ? (
                <>
                  <p>
                    La bibliothèque ne contient que des exemples fictifs. Importez les publications
                    officielles de HEXAGONE MMA pour construire son ADN éditorial.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setFilters((f) => ({ ...f, includeDemo: true }))}
                  >
                    Afficher les exemples fictifs
                  </Button>
                </>
              ) : (
                <>
                  <p>Aucune publication ne correspond à la recherche.</p>
                  <Button variant="secondary" onClick={reset}>
                    Réinitialiser les filtres
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}

      <RecordSheet
        item={consulted ? { kind: "wording", record: consulted } : null}
        onClose={() => setConsulted(null)}
      />
      <DeleteWordingDialog wording={deleting} onClose={() => setDeleting(null)} />
      {data && form ? (
        <WordingForm
          title={FORM_TITLES[form.kind]}
          initial={
            form.kind === "create" ? emptyForm(mode) : formFromWording(form.wording, data.fighters)
          }
          existing={form.kind === "edit" ? form.wording : undefined}
          data={data}
          onClose={() => setForm(null)}
        />
      ) : null}
      {data && importing === "bulk" ? (
        <BulkImportModal data={data} onClose={() => setImporting(null)} />
      ) : null}
      {data && importing === "table" ? (
        <TableImportModal data={data} onClose={() => setImporting(null)} />
      ) : null}
      {data && importing === "instagram" ? (
        <InstagramImportModal data={data} onClose={() => setImporting(null)} />
      ) : null}
    </div>
  );
}
