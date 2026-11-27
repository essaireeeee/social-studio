"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Badge } from "@/components/ui/badge";
import { Cell, GroupedSection } from "@/components/ui/grouped-list";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useFrenchSources } from "@/hooks/useFrenchContext";
import { useRepository } from "@/hooks/useRepository";
import {
  autoWords,
  buildDictionary,
  DICTIONARY_KIND_LABELS,
  MMA_LEXICON,
} from "@/lib/french/dictionary";
import { toast } from "@/stores/toast.store";
import type { FrenchDictionaryEntry } from "@/types/v2";
import { AddWords } from "../dictionary/AddWords";

const MAX_AUTO_SHOWN = 200;

/** Dictionnaire (section 6.5) : mots du CM, mots tirés des fiches, lexique MMA. */
export function DictionaryPage() {
  const repository = useRepository();
  const sources = useFrenchSources();
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<FrenchDictionaryEntry | null>(null);

  const term = query.trim().toLowerCase();
  const match = (word: string) => !term || word.toLowerCase().includes(term);
  const known = useMemo(() => (sources ? buildDictionary(sources) : new Set<string>()), [sources]);
  const auto = useMemo(() => (sources ? autoWords(sources) : []), [sources]);

  if (!sources) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-3 sm:px-6">
        <LargeTitle>Dictionnaire</LargeTitle>
        <Skeleton className="mt-6 h-64 rounded-xl" />
      </div>
    );
  }

  const own = [...sources.entries]
    .filter((e) => match(e.word))
    .sort((a, b) => a.word.localeCompare(b.word, "fr"));
  const autoShown = auto.filter((w) => match(w.word));
  const lexicon = MMA_LEXICON.filter(match);

  const remove = async (entry: FrenchDictionaryEntry) => {
    await repository?.frenchDictionary.delete(entry.id);
    toast(`« ${entry.word} » retiré du dictionnaire`, "neutral");
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Dictionnaire</LargeTitle>
        <p className="text-subheadline text-muted-foreground">
          Mots que le correcteur ne signale jamais : vos ajouts, les noms tirés des fiches et le
          lexique du MMA.
        </p>
      </header>
      <AddWords known={known} />
      <SearchField
        label="Rechercher dans le dictionnaire"
        value={query}
        onValueChange={setQuery}
        placeholder="Rechercher"
      />

      <GroupedSection
        id="mes-mots"
        header={`Mes mots · ${sources.entries.length}`}
        footer={
          own.length === 0
            ? term
              ? "Aucun mot ne correspond."
              : "Aucun mot ajouté pour l'instant."
            : undefined
        }
      >
        {own.map((entry) => (
          <Cell
            key={entry.id}
            title={entry.word}
            subtitle={DICTIONARY_KIND_LABELS[entry.kind]}
            accessory={
              <button
                type="button"
                onClick={() => setRemoving(entry)}
                aria-label={`Supprimer « ${entry.word} »`}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-danger hover:bg-fill pointer-coarse:size-11"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            }
          />
        ))}
      </GroupedSection>

      <GroupedSection
        id="mots-fiches"
        header={`Tirés des fiches · ${auto.length}`}
        footer={
          autoShown.length > MAX_AUTO_SHOWN
            ? `${autoShown.length - MAX_AUTO_SHOWN} autres mots : affinez la recherche.`
            : "Calculés à partir des fiches combattants, événements et sessions live. Modifiez la fiche pour les changer."
        }
      >
        {autoShown.slice(0, MAX_AUTO_SHOWN).map((word) => (
          <Cell
            key={word.word}
            title={word.word}
            subtitle={
              word.source && word.source !== word.word
                ? `${DICTIONARY_KIND_LABELS[word.kind]} · ${word.source}`
                : DICTIONARY_KIND_LABELS[word.kind]
            }
          />
        ))}
      </GroupedSection>

      <section aria-labelledby="lexique-titre" className="flex flex-col gap-1.5">
        <h2
          id="lexique-titre"
          className="px-4 text-footnote tracking-wide text-muted-foreground uppercase"
        >
          Lexique MMA · {MMA_LEXICON.length}
        </h2>
        <ul className="flex flex-wrap gap-1.5 rounded-xl bg-surface p-4 squircle">
          {lexicon.map((word) => (
            <li key={word}>
              <Badge>{word}</Badge>
            </li>
          ))}
        </ul>
        <p className="px-4 text-footnote text-muted-foreground">
          Livré avec l&apos;application, en lecture seule.
        </p>
      </section>

      <ConfirmDialog
        open={removing !== null}
        title={removing ? `Retirer « ${removing.word} » du dictionnaire ?` : ""}
        description="Le correcteur pourra de nouveau le signaler."
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (removing) void remove(removing);
          setRemoving(null);
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
