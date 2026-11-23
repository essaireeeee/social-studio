/**
 * Actions de la palette de commandes (section 12.2). Seules les actions réellement
 * disponibles sont proposées. Logique pure : le composant exécute l'action choisie.
 */
import { getCategory } from "@/lib/categories/registry";
import { normalizeText } from "@/lib/editorial/text-utils";
import { eventLabelOf } from "@/lib/generation/native/context";
import type { Fighter, HexEvent, Mode, Wording } from "@/types/domain";
import { MODE_LABELS } from "./mode";
import { NAV_ITEMS } from "./navigation";

export type ActionId =
  | "mode-live"
  | "mode-daily"
  | "session-start"
  | "session-edit"
  | "session-end"
  | "sidebar-toggle"
  | `nav:${string}`;

export interface ActionCommand {
  id: ActionId;
  label: string;
  /** Raccourci affiché. */
  shortcut?: string;
  keywords: string;
}

export interface ActionContext {
  mode: Mode;
  hasActiveSession: boolean;
  sidebarCollapsed: boolean;
}

export function actionCommands(ctx: ActionContext): ActionCommand[] {
  const actions: ActionCommand[] = [];
  if (ctx.mode !== "live") {
    actions.push({
      id: "mode-live",
      label: `Passer en ${MODE_LABELS.live}`,
      shortcut: "Alt+L",
      keywords: "mode live soiree",
    });
  }
  if (ctx.mode !== "daily") {
    actions.push({
      id: "mode-daily",
      label: `Passer en ${MODE_LABELS.daily}`,
      shortcut: "Alt+D",
      keywords: "mode daily media",
    });
  }
  if (ctx.hasActiveSession) {
    actions.push(
      { id: "session-edit", label: "Modifier la Session Live", keywords: "session live evenement" },
      {
        id: "session-end",
        label: "Terminer la Session Live",
        keywords: "session live fin archiver",
      },
    );
  } else {
    actions.push({
      id: "session-start",
      label: "Démarrer une Session Live",
      keywords: "session live evenement soiree",
    });
  }
  for (const item of NAV_ITEMS.filter((i) => i.available)) {
    actions.push({
      id: `nav:${item.id}`,
      label: `Ouvrir : ${item.label}`,
      keywords: `ouvrir aller page ${item.href}`,
    });
  }
  actions.push({
    id: "sidebar-toggle",
    label: ctx.sidebarCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale",
    keywords: "menu navigation barre laterale",
  });
  return actions;
}

/** Tous les mots de la saisie doivent figurer dans le libellé ou les mots-clés. */
export function filterActions(actions: readonly ActionCommand[], query: string): ActionCommand[] {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (words.length === 0) return [...actions];
  return actions.filter((action) => {
    const haystack = normalizeText(`${action.label} ${action.keywords}`);
    return words.every((word) => haystack.includes(word));
  });
}

// ---------------------------------------------------------------------------
// Résultats de la palette
// ---------------------------------------------------------------------------

/** Fiche ouverte depuis la palette, en lecture seule. */
export type PaletteRecord =
  | { kind: "wording"; record: Wording }
  | { kind: "fighter"; record: Fighter }
  | { kind: "event"; record: HexEvent };

export type PaletteEntry =
  | { key: string; group: "Actions"; label: string; hint?: string; action: ActionId }
  | {
      key: string;
      group: "Wordings" | "Combattants" | "Événements";
      label: string;
      hint?: string;
      record: PaletteRecord;
    };

export interface PaletteFound {
  wordings: Wording[];
  fighters: Fighter[];
  events: HexEvent[];
}

export const EMPTY_FOUND: PaletteFound = { wordings: [], fighters: [], events: [] };

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim()) ?? "";
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/** Liste ordonnée : actions, puis wordings (exemples fictifs signalés), combattants, événements. */
export function paletteEntries(
  actions: readonly ActionCommand[],
  found: PaletteFound,
): PaletteEntry[] {
  return [
    ...actions.map((a): PaletteEntry => ({
      key: a.id,
      group: "Actions",
      label: a.label,
      hint: a.shortcut,
      action: a.id,
    })),
    ...found.wordings.map((w): PaletteEntry => ({
      key: `w-${w.id}`,
      group: "Wordings",
      label: firstLine(w.text),
      hint: `${getCategory(w.categoryId)?.label ?? ""} · ${MODE_LABELS[w.mode]}${w.isDemo ? " · Exemple fictif" : ""}`,
      record: { kind: "wording", record: w },
    })),
    ...found.fighters.map((f): PaletteEntry => ({
      key: `f-${f.id}`,
      group: "Combattants",
      label: `${f.firstName} ${f.lastName}`.trim(),
      hint: f.nickname ?? f.weightClass,
      record: { kind: "fighter", record: f },
    })),
    ...found.events.map((e): PaletteEntry => ({
      key: `e-${e.id}`,
      group: "Événements",
      label: eventLabelOf(e.name, e.number),
      hint: e.city,
      record: { kind: "event", record: e },
    })),
  ];
}
