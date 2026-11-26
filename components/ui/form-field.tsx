import type { ReactNode } from "react";

/**
 * Champ de formulaire : libellé relié par `htmlFor`, puis message d'erreur (`{id}-error`)
 * ou aide (`{id}-hint`), à relier au contrôle par `aria-describedby`.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-footnote font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-footnote text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` assorti à `FormField`. */
export const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;
