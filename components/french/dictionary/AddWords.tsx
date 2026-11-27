"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormGroup } from "@/components/ui/form-group";
import { Input } from "@/components/ui/input";
import { useRepository } from "@/hooks/useRepository";
import { MAX_DICTIONARY_WORD, newEntries, wordsFromCsv } from "@/lib/french/dictionary";
import { parseCsv } from "@/lib/import/csv";
import { toast } from "@/stores/toast.store";

/** Ajout d'un mot et import CSV (un mot par ligne, ou première colonne). */
export function AddWords({ known }: { known: ReadonlySet<string> }) {
  const repository = useRepository();
  const [word, setWord] = useState("");
  const [error, setError] = useState<string>();
  const file = useRef<HTMLInputElement>(null);

  const save = async (words: string[]) => {
    if (!repository) return { added: 0, skipped: words.length };
    const { entries, skipped } = newEntries(words, known, new Date().toISOString(), () =>
      crypto.randomUUID(),
    );
    if (entries.length > 0) await repository.frenchDictionary.bulkPut(entries);
    return { added: entries.length, skipped: skipped.length };
  };

  const add = async () => {
    const value = word.trim();
    if (!value) return;
    if (known.has(value.toLowerCase())) {
      setError(`« ${value} » est déjà connu du correcteur.`);
      return;
    }
    if (value.length > MAX_DICTIONARY_WORD) {
      setError(`${MAX_DICTIONARY_WORD} caractères au maximum.`);
      return;
    }
    await save([value]);
    setWord("");
    setError(undefined);
    toast(`« ${value} » ajouté au dictionnaire`, "success");
  };

  const importCsv = async (input: File) => {
    try {
      const table = parseCsv(await input.text());
      const words = wordsFromCsv([table.headers, ...table.rows]);
      if (words.length === 0) {
        toast("Aucun mot trouvé dans ce fichier.", "neutral");
        return;
      }
      const { added, skipped } = await save(words);
      toast(
        `${added} mot${added > 1 ? "s" : ""} importé${added > 1 ? "s" : ""}` +
          (skipped
            ? `, ${skipped} déjà connu${skipped > 1 ? "s" : ""} ou invalide${skipped > 1 ? "s" : ""}`
            : ""),
        added ? "success" : "neutral",
      );
    } catch {
      toast("Fichier illisible : un CSV avec un mot par ligne est attendu.", "danger");
    }
  };

  return (
    <FormGroup
      title="Ajouter"
      footer="Import CSV : un mot ou une expression par ligne (ou dans la première colonne). Les mots déjà connus sont ignorés."
    >
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Input
          aria-label="Mot à ajouter"
          placeholder="Nom, salle, expression…"
          value={word}
          onChange={(event) => {
            setWord(event.target.value);
            setError(undefined);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "dictionary-error" : undefined}
          className="flex-1"
        />
        <Button type="submit" disabled={!word.trim()}>
          Ajouter
        </Button>
        <Button type="button" variant="secondary" onClick={() => file.current?.click()}>
          Importer un CSV
        </Button>
        <input
          ref={file}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          aria-label="Fichier CSV de mots"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (selected) void importCsv(selected);
          }}
        />
      </form>
      {error ? (
        <p id="dictionary-error" role="alert" className="text-footnote text-danger">
          {error}
        </p>
      ) : null}
    </FormGroup>
  );
}
