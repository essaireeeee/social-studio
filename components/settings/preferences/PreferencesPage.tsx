"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import type { Settings } from "@/types/domain";
import { toast } from "@/stores/toast.store";
import { preferencesErrors } from "@/lib/settings/preferences";
import { PreferencesForm } from "./PreferencesForm";

/** Paramètres > Préférences (section 16.3). */
export function PreferencesPage() {
  const repository = useRepository();
  const stored = useLiveQuery(() => repository?.getSettings(), [repository]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Préférences</h1>
        <p className="text-13 text-muted-foreground">
          Réglages du Studio et de l&apos;aperçu. Ils sont inclus dans les sauvegardes.
        </p>
      </header>
      {stored ? (
        <Editor key={stored.accountName + stored.igTruncation} stored={stored} />
      ) : (
        <div
          className="h-64 animate-pulse rounded-lg border border-border bg-card"
          aria-busy="true"
        />
      )}
    </div>
  );
}

function Editor({ stored }: { stored: Settings }) {
  const repository = useRepository();
  const [values, setValues] = useState<Settings>(stored);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!repository) return;
    const found = preferencesErrors(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      // Le mode et le moteur ont pu changer ailleurs entre-temps : ils sont relus.
      const current = await repository.getSettings();
      await repository.saveSettings({
        ...values,
        lastMode: current.lastMode,
        aiProvider: current.aiProvider,
        activeUserId: current.activeUserId,
      });
      toast("Préférences enregistrées", "success");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-6"
      aria-label="Préférences"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <PreferencesForm
        values={values}
        errors={errors}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      />
      <Button type="submit" loading={busy} className="self-start">
        Enregistrer les préférences
      </Button>
    </form>
  );
}
