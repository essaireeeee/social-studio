"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { saveFighter } from "@/lib/fighters/actions";
import { fighterForm, fighterFormErrors, type FighterFormErrors } from "@/lib/fighters/form";
import { toast } from "@/stores/toast.store";
import type { Fighter, HexEvent } from "@/types/domain";
import { FightHistoryTable } from "./FightHistoryTable";
import { FighterFields } from "./FighterFields";

interface FighterFormProps {
  fighter?: Fighter;
  events: readonly HexEvent[];
  onSaved: (fighter: Fighter) => void;
}

/** Fiche combattant éditable : tous les champs du type `Fighter` (section 15.1). */
export function FighterForm({ fighter, events, onSaved }: FighterFormProps) {
  const repository = useRepository();
  const [values, setValues] = useState(() => fighterForm(fighter));
  const [errors, setErrors] = useState<FighterFormErrors>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!repository) return;
    const found = fighterFormErrors(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`fighter-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const saved = await saveFighter(repository, values, { existing: fighter });
      toast(fighter ? "Fiche mise à jour" : "Combattant ajouté", "success");
      onSaved(saved);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Enregistrement impossible.", "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      aria-label={fighter ? "Fiche combattant" : "Nouveau combattant"}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FighterFields
        values={values}
        errors={errors}
        update={(patch) => setValues((v) => ({ ...v, ...patch }))}
      />
      <section className="flex flex-col gap-2" aria-label="Historique de combats">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Historique de combats
        </h3>
        <FightHistoryTable
          rows={values.fightHistory}
          events={events}
          errors={errors}
          onChange={(fightHistory) => setValues((v) => ({ ...v, fightHistory }))}
        />
      </section>
      <Button type="submit" loading={busy} className="self-start">
        {fighter ? "Enregistrer la fiche" : "Créer la fiche"}
      </Button>
    </form>
  );
}
