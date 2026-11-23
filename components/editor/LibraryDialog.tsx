"use client";

import { WordingForm } from "@/components/library/WordingForm";
import { useLibraryData } from "@/hooks/useLibraryData";
import { useRepository } from "@/hooks/useRepository";
import { formFromGeneration, inputFromForm } from "@/lib/library/form";
import { saveToLibrary } from "@/lib/studio/actions";
import type { Generation } from "@/types/domain";

interface LibraryDialogProps {
  generation: Generation;
  text: string;
  onClose: () => void;
}

/**
 * « Enregistrer dans la bibliothèque » depuis le Studio : la fiche complète de la
 * bibliothèque, pré-remplie depuis le brief, statut `validated`, source `studio`.
 */
export function LibraryDialog({ generation, text, onClose }: LibraryDialogProps) {
  const repository = useRepository();
  const data = useLibraryData();
  if (!data || !repository) return null;
  return (
    <WordingForm
      title="Enregistrer dans la bibliothèque"
      initial={formFromGeneration(generation, text, data)}
      data={data}
      savedMessage="Enregistré dans la bibliothèque"
      onSave={(values) =>
        saveToLibrary(repository, generation, inputFromForm(values, data.fighters))
      }
      onClose={onClose}
    />
  );
}
