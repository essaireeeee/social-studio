"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryData } from "@/hooks/useLibraryData";
import { plural } from "@/lib/format";
import { splitPosts } from "@/lib/import/splitter";
import type { ImportRecord } from "@/lib/import/table";
import { ImportDialog } from "./ImportDialog";
import { ImportReviewFlow } from "./ImportReviewFlow";

/** Import en masse (section 14.3) : coller, vérifier, confirmer. */
export function BulkImportModal({ data, onClose }: { data: LibraryData; onClose: () => void }) {
  const [text, setText] = useState("");
  const [records, setRecords] = useState<ImportRecord[] | null>(null);
  const [step, setStep] = useState<"review" | "confirm">("review");
  const posts = useMemo(() => splitPosts(text), [text]);

  return (
    <ImportDialog
      title="Coller plusieurs publications"
      description="Collez vos publications à la suite, séparées par une ligne qui ne contient que === ."
      steps={["Coller", "Vérifier", "Confirmer"]}
      current={records ? (step === "review" ? 1 : 2) : 0}
      onClose={onClose}
    >
      {records ? (
        <ImportReviewFlow
          records={records}
          source="bulk"
          data={data}
          step={step}
          onStep={setStep}
          onBack={() => setRecords(null)}
          onDone={onClose}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <label htmlFor="bulk-text" className="text-xs text-muted-foreground">
            Publications à importer
          </label>
          <Textarea
            id="bulk-text"
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Première publication…\n===\nDeuxième publication…"}
            className="font-mono text-xs"
          />
          <p className="text-13 font-medium" aria-live="polite" data-testid="bulk-count">
            {plural(posts.length, "publication détectée", "publications détectées")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button
              disabled={posts.length === 0}
              onClick={() => {
                setStep("review");
                setRecords(posts.map((post) => ({ text: post })));
              }}
            >
              Vérifier
            </Button>
          </div>
        </div>
      )}
    </ImportDialog>
  );
}
