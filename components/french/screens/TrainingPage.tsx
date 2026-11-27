"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Button } from "@/components/ui/button";
import { FormGroup } from "@/components/ui/form-group";
import { Cell, GroupedSection } from "@/components/ui/grouped-list";
import { useRepository } from "@/hooks/useRepository";
import { FAMILY_LABELS } from "@/lib/french/labels";
import {
  buildSeries,
  recordAnswer,
  type Exercise,
  type TrainingProgress,
} from "@/lib/french/training";
import { cn } from "@/lib/utils";
import { FrenchRuleFamilySchema } from "@/types/v2";

interface Run {
  series: Exercise[];
  index: number;
  choice: string | null;
  score: number;
}

/** Entraînement (section 6.5) : séries de 10, tirées des erreurs passées du CM. */
export function TrainingPage() {
  const repository = useRepository();
  const records = useLiveQuery(() => repository?.frenchIssues.list(), [repository]);
  const progress = useLiveQuery(
    async () => ((await repository?.getMeta("frenchProgress")) ?? {}) as TrainingProgress,
    [repository],
  );
  const [run, setRun] = useState<Run | null>(null);

  const start = () => {
    const series = buildSeries(records ?? [], Date.now(), new Date());
    setRun({ series, index: 0, choice: null, score: 0 });
  };

  const answer = (option: string) => {
    if (!run || run.choice !== null || !repository) return;
    const exercise = run.series[run.index]!;
    const correct = option === exercise.answer;
    setRun({ ...run, choice: option, score: run.score + (correct ? 1 : 0) });
    void repository
      .getMeta("frenchProgress")
      .then((stored) =>
        repository.setMeta(
          "frenchProgress",
          recordAnswer((stored ?? {}) as TrainingProgress, exercise, correct),
        ),
      );
  };

  const finished = run !== null && run.index >= run.series.length;
  const exercise = run && !finished ? run.series[run.index] : undefined;
  const families = FrenchRuleFamilySchema.options.filter((f) => progress?.[f]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Entraînement</LargeTitle>
        <p className="text-subheadline text-muted-foreground">
          Dix exercices courts, tirés de vos erreurs passées et des exemples des règles concernées.
        </p>
      </header>

      {exercise && run ? (
        <FormGroup title={`Exercice ${run.index + 1} sur ${run.series.length}`}>
          <ExerciseView exercise={exercise} choice={run.choice} onAnswer={answer} />
          {run.choice !== null ? (
            <Button
              className="self-start"
              onClick={() => setRun({ ...run, index: run.index + 1, choice: null })}
            >
              {run.index + 1 < run.series.length ? "Question suivante" : "Voir le résultat"}
            </Button>
          ) : null}
        </FormGroup>
      ) : (
        <FormGroup title={finished ? "Série terminée" : "Nouvelle série"}>
          {finished && run ? (
            <p className="text-title-3" role="status">
              {run.score} bonne{run.score > 1 ? "s" : ""} réponse{run.score > 1 ? "s" : ""} sur{" "}
              {run.series.length}
            </p>
          ) : (
            <p className="text-subheadline text-muted-foreground">
              Phrases à trou ou choix entre deux formes. La correction et l&apos;explication
              s&apos;affichent tout de suite.
            </p>
          )}
          <Button className="self-start" onClick={start} disabled={records === undefined}>
            {finished ? "Nouvelle série" : "Commencer une série"}
          </Button>
        </FormGroup>
      )}

      <GroupedSection
        id="progression"
        header="Progression par famille"
        footer={families.length === 0 ? "Aucune réponse enregistrée pour l'instant." : undefined}
      >
        {families.map((family) => {
          const value = progress![family]!;
          return (
            <Cell
              key={family}
              title={FAMILY_LABELS[family]}
              value={`${value.correct} / ${value.answered}`}
            />
          );
        })}
      </GroupedSection>
    </div>
  );
}

function ExerciseView({
  exercise,
  choice,
  onAnswer,
}: {
  exercise: Exercise;
  choice: string | null;
  onAnswer: (option: string) => void;
}) {
  const [before, after] = exercise.kind === "gap" ? exercise.prompt.split("___") : [];
  const answered = choice !== null;
  return (
    <div className="flex flex-col gap-4">
      {exercise.kind === "gap" ? (
        <p className="text-title-3" data-testid="exercise-prompt">
          {before}
          <span className="mx-0.5 inline-block min-w-16 border-b-2 border-label-3 text-center">
            {answered ? exercise.answer : " "}
          </span>
          {after}
        </p>
      ) : (
        <p className="text-headline" data-testid="exercise-prompt">
          {exercise.prompt}
        </p>
      )}
      <div className={cn("grid gap-2", exercise.kind === "gap" && "sm:grid-cols-2")}>
        {exercise.options.map((option) => {
          const isAnswer = option === exercise.answer;
          const picked = option === choice;
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(option)}
              aria-pressed={picked}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-body accent-transition disabled:cursor-default",
                !answered && "border-separator bg-surface-2 hover:bg-fill",
                answered && isAnswer && "border-success/40 bg-success/10 text-success",
                answered && picked && !isAnswer && "border-danger/40 bg-danger/10 text-danger",
                answered && !picked && !isAnswer && "border-separator opacity-60",
              )}
            >
              <span>{option}</span>
              {answered && isAnswer ? (
                <Check className="size-4 shrink-0" aria-hidden="true" />
              ) : null}
              {answered && picked && !isAnswer ? (
                <X className="size-4 shrink-0" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div role="status" className="flex flex-col gap-1 rounded-lg bg-surface-2 p-3">
          <p
            className={cn(
              "text-headline",
              choice === exercise.answer ? "text-success" : "text-danger",
            )}
          >
            {choice === exercise.answer
              ? "Bonne réponse"
              : `Raté : la bonne forme est « ${exercise.answer} »`}
          </p>
          <p className="text-subheadline">{exercise.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
