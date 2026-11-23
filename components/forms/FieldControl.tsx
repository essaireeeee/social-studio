"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeFightTime,
  resolveFieldOptions,
  winnerChoices,
  type CategoryDef,
  type FieldDef,
} from "@/lib/categories/registry";
import { eventLabelOf } from "@/lib/generation/native/context";
import type { BriefFields } from "@/lib/shell/mode";
import type { BriefFieldValue, Fighter, HexEvent, Settings } from "@/types/domain";
import { FighterCombobox } from "./fields/FighterCombobox";
import { MultiFighterField } from "./fields/MultiFighterField";
import { QuickChips } from "./fields/QuickChips";
import { WinnerToggle } from "./fields/WinnerToggle";

export interface FieldContext {
  settings: Pick<Settings, "quickOptions">;
  fighters: readonly Fighter[];
  events: readonly HexEvent[];
  priorityIds: readonly string[];
  fightCard: string[];
}

interface FieldControlProps {
  def: FieldDef;
  category: CategoryDef;
  fields: BriefFields;
  error?: string;
  ctx: FieldContext;
  onChange: (value: BriefFieldValue | undefined) => void;
}

const asString = (value: BriefFieldValue | undefined) =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

/** Contrôle d'un champ du registre, selon son type (section 7.1). */
export function FieldControl({ def, category, fields, error, ctx, onChange }: FieldControlProps) {
  const id = `field-${def.key}`;
  const value = fields[def.key];
  const describedBy =
    [error ? `${id}-error` : "", def.helpText ? `${id}-help` : ""].filter(Boolean).join(" ") ||
    undefined;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  const text = (v: string) => onChange(v === "" ? undefined : v);

  switch (def.type) {
    case "fighter": {
      if (def.multiple) {
        return (
          <MultiFighterField
            id={id}
            label={def.label}
            value={Array.isArray(value) ? value : []}
            fighters={ctx.fighters}
            priorityIds={ctx.priorityIds}
            invalid={Boolean(error)}
            describedBy={describedBy}
            onChange={onChange}
          />
        );
      }
      const choices = def.key === "winner" ? winnerChoices(category, fields) : null;
      if (choices) {
        return <WinnerToggle choices={choices} value={asString(value)} onChange={onChange} />;
      }
      return (
        <FighterCombobox
          id={id}
          label={def.label}
          value={asString(value)}
          fighters={ctx.fighters}
          priorityIds={ctx.priorityIds}
          placeholder={def.placeholder}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={text}
        />
      );
    }
    case "chips":
      return (
        <QuickChips
          id={id}
          label={def.label}
          options={resolveFieldOptions(def, category, {
            settings: ctx.settings,
            fightCard: ctx.fightCard,
          })}
          value={typeof value === "string" || Array.isArray(value) ? value : undefined}
          multiple={def.multiple}
          allowCustom={def.allowCustom}
          describedBy={describedBy}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <select
          {...common}
          value={asString(value)}
          onChange={(event) => text(event.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-13 aria-invalid:border-danger"
        >
          <option value="">Non précisé</option>
          {resolveFieldOptions(def, category, { settings: ctx.settings }).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <Textarea
          {...common}
          autoResize
          rows={2}
          maxLength={def.maxLength}
          placeholder={def.placeholder}
          value={asString(value)}
          onChange={(event) => text(event.target.value)}
        />
      );
    case "toggle":
      return (
        <label className="flex items-center gap-2 text-13">
          <input
            {...common}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked || undefined)}
            className="size-4 accent-[var(--accent)]"
          />
          Oui
        </label>
      );
    case "time":
      return (
        <Input
          {...common}
          inputMode={def.timeFormat === "fight" ? "numeric" : undefined}
          placeholder={def.placeholder ?? (def.timeFormat === "fight" ? "m:ss" : "20h30")}
          value={asString(value)}
          onChange={(event) => text(event.target.value)}
          onBlur={(event) => {
            if (def.timeFormat === "fight" && event.target.value) {
              text(normalizeFightTime(event.target.value));
            }
          }}
        />
      );
    case "event":
      return (
        <>
          <Input
            {...common}
            list={`${id}-events`}
            placeholder={def.placeholder ?? "Événement de la base ou nom libre"}
            value={asString(value)}
            onChange={(event) => text(event.target.value)}
          />
          <datalist id={`${id}-events`}>
            {ctx.events.map((e) => (
              <option key={e.id} value={eventLabelOf(e.name, e.number)} />
            ))}
          </datalist>
        </>
      );
    default:
      return (
        <Input
          {...common}
          type={def.type === "url" ? "url" : def.type === "date" ? "date" : "text"}
          inputMode={def.inputMode}
          maxLength={def.maxLength}
          placeholder={def.placeholder}
          value={asString(value)}
          onChange={(event) => text(event.target.value)}
        />
      );
  }
}
