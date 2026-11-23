import { cn } from "@/lib/utils";

/** Étapes de l'import, l'étape en cours est annoncée (`aria-current="step"`). */
export function ImportStepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Étapes de l'import">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-1.5",
            index === current ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border text-[11px]",
              index === current
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border",
            )}
          >
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
