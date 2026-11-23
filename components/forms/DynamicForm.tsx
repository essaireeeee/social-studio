"use client";

import {
  getCategoryLayout,
  hasValue,
  isFieldVisible,
  type CategoryDef,
  type FieldDef,
} from "@/lib/categories/registry";
import type { BriefFields } from "@/lib/shell/mode";
import type { BriefFieldValue } from "@/types/domain";
import { FieldControl, type FieldContext } from "./FieldControl";

interface DynamicFormProps {
  category: CategoryDef;
  fields: BriefFields;
  errors: Record<string, string>;
  ctx: FieldContext;
  onChange: (key: string, value: BriefFieldValue | undefined) => void;
}

/** Formulaire généré depuis le registre (section 13.3) : requis, puis options, puis détails. */
export function DynamicForm({ category, fields, errors, ctx, onChange }: DynamicFormProps) {
  const layout = getCategoryLayout(category);
  const visible = (defs: FieldDef[]) => defs.filter((d) => isFieldVisible(d.key, category, fields));
  const more = visible(layout.more);
  const required = new Set(category.required);

  const row = (def: FieldDef) => {
    const id = `field-${def.key}`;
    const error = errors[def.key];
    const labelled = def.type !== "toggle" && def.type !== "chips";
    return (
      <div key={def.key} className="flex flex-col gap-1.5">
        {labelled ? (
          <label
            htmlFor={id}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            {def.label}
            {required.has(def.key) ? (
              <span className="size-1.5 rounded-full bg-accent" aria-label="requis" />
            ) : null}
          </label>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {def.label}
            {required.has(def.key) ? (
              <span className="size-1.5 rounded-full bg-accent" aria-label="requis" />
            ) : null}
          </p>
        )}
        <FieldControl
          def={def}
          category={category}
          fields={fields}
          error={error}
          ctx={ctx}
          onChange={(value) => onChange(def.key, value)}
        />
        {def.helpText ? (
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            {def.helpText}
          </p>
        ) : null}
        {error ? (
          <p id={`${id}-error`} className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {visible(layout.required).map(row)}
      {visible(layout.promoted).map(row)}
      {more.length > 0 ? (
        <details
          className="group rounded-md border border-border"
          open={more.some((d) => hasValue(fields[d.key]) || errors[d.key]) || undefined}
        >
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            Plus de détails
          </summary>
          <div className="flex flex-col gap-3 px-3 pb-3">{more.map(row)}</div>
        </details>
      ) : null}
    </div>
  );
}
