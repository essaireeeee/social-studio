import { describe, expect, it } from "vitest";
import { formatRelative, isStale } from "@/lib/format";
import { actionCommands, filterActions, paletteEntries } from "@/lib/shell/commands";
import { COMMON_FIELD_KEYS, commonFields } from "@/lib/shell/mode";
import { COMING_SOON, NAV_ITEMS, NAV_SECTIONS, isActive, navItem } from "@/lib/shell/navigation";
import {
  PREPAINT_SCRIPT,
  isCommandShortcut,
  modeFromShortcut,
  type KeyLike,
} from "@/lib/shell/shortcuts";

const key = (patch: Partial<KeyLike>): KeyLike => ({
  code: "",
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...patch,
});

describe("navigation (section 12.1)", () => {
  it("quatre sections, dans l'ordre de la spec", () => {
    expect(NAV_SECTIONS.map((s) => [s.label, s.items.map((i) => i.label)])).toEqual([
      ["Workspace", ["Dashboard", "Social Studio", "LIVE SHOW", "DAILY & MEDIA"]],
      [
        "Ressources",
        [
          "Bibliothèque de wordings",
          "Combattants",
          "Événements",
          "Hashtags & signatures",
          "ADN éditorial",
        ],
      ],
      ["Suivi", ["Historique", "Publications validées"]],
      [
        "Paramètres",
        ["Intelligence artificielle", "Préférences", "Gestion des données", "Utilisateurs"],
      ],
    ]);
  });

  it("seuls les écrans livrés sont actifs, les autres portent « Bientôt disponible »", () => {
    expect(NAV_ITEMS.filter((i) => i.available).map((i) => i.href)).toEqual([
      "/studio",
      "/studio?mode=live",
      "/studio?mode=daily",
      "/library",
      "/fighters",
      "/events",
      "/hashtags",
      "/editorial",
      "/settings/ai",
    ]);
    expect(COMING_SOON).toBe("Bientôt disponible");
    expect(navItem("studio-live")).toMatchObject({ href: "/studio?mode=live", mode: "live" });
  });

  it("entrée active : chemin exact ou sous-chemin", () => {
    const editorial = navItem("editorial")!;
    expect(isActive(editorial, "/editorial")).toBe(true);
    expect(isActive(editorial, "/editorial/regles")).toBe(true);
    expect(isActive(editorial, "/editorialx")).toBe(false);
    // Dans le Studio, seule l'entrée du mode actif est marquée.
    expect(isActive(navItem("studio-live")!, "/studio", "live")).toBe(true);
    expect(isActive(navItem("studio-daily")!, "/studio", "live")).toBe(false);
    expect(isActive(navItem("studio")!, "/studio", "live")).toBe(false);
  });
});

describe("raccourcis (section 12.2)", () => {
  it("Alt+L et Alt+D, par la touche physique", () => {
    expect(modeFromShortcut(key({ altKey: true, code: "KeyL" }))).toBe("live");
    expect(modeFromShortcut(key({ altKey: true, code: "KeyD" }))).toBe("daily");
    expect(modeFromShortcut(key({ code: "KeyL" }))).toBeNull();
    expect(modeFromShortcut(key({ altKey: true, ctrlKey: true, code: "KeyL" }))).toBeNull();
  });

  it("Cmd+K et Ctrl+K", () => {
    expect(isCommandShortcut(key({ metaKey: true, code: "KeyK" }))).toBe(true);
    expect(isCommandShortcut(key({ ctrlKey: true, code: "KeyK" }))).toBe(true);
    expect(isCommandShortcut(key({ ctrlKey: true, shiftKey: true, code: "KeyK" }))).toBe(false);
    expect(isCommandShortcut(key({ code: "KeyK" }))).toBe(false);
  });

  it("script avant affichage : lit le mode et la barre, tolère un stockage indisponible", () => {
    expect(PREPAINT_SCRIPT).toContain('localStorage.getItem("hex-mode")');
    expect(PREPAINT_SCRIPT).toContain('"data-sidebar","collapsed"');
    expect(PREPAINT_SCRIPT).toMatch(/try\{.*\}catch\(e\)\{\}/);
  });
});

describe("changement de mode (section 12.2)", () => {
  it("garde les champs communs, jamais les autres", () => {
    expect(COMMON_FIELD_KEYS).toEqual(expect.arrayContaining(["winner", "fighterA", "event"]));
    expect(COMMON_FIELD_KEYS).not.toContain("round");
    expect(
      commonFields({ winner: "Karim Fictif", round: "R2", event: "HEXAGONE MMA 12", loser: "" }),
    ).toEqual({ winner: "Karim Fictif", event: "HEXAGONE MMA 12" });
  });
});

describe("palette de commandes", () => {
  it("propose l'autre mode et l'action de session qui convient", () => {
    const live = actionCommands({ mode: "live", hasActiveSession: false, sidebarCollapsed: false });
    expect(live.map((a) => a.label)).toEqual([
      "Passer en DAILY & MEDIA",
      "Démarrer une Session Live",
      "Ouvrir : Social Studio",
      "Ouvrir : Bibliothèque de wordings",
      "Ouvrir : Combattants",
      "Ouvrir : Événements",
      "Ouvrir : Hashtags & signatures",
      "Ouvrir : ADN éditorial",
      "Ouvrir : Intelligence artificielle",
      "Replier la barre latérale",
    ]);
    const daily = actionCommands({ mode: "daily", hasActiveSession: true, sidebarCollapsed: true });
    expect(daily.map((a) => a.id)).toEqual([
      "mode-live",
      "session-edit",
      "session-end",
      "nav:studio",
      "nav:library",
      "nav:fighters",
      "nav:events",
      "nav:hashtags",
      "nav:editorial",
      "nav:settings-ai",
      "sidebar-toggle",
    ]);
  });

  it("filtre par mots, sans accents ni casse", () => {
    const all = actionCommands({ mode: "live", hasActiveSession: false, sidebarCollapsed: false });
    expect(filterActions(all, "session").map((a) => a.id)).toEqual(["session-start"]);
    expect(filterActions(all, "ADN EDITO").map((a) => a.id)).toEqual(["nav:editorial"]);
    expect(filterActions(all, "")).toHaveLength(all.length);
  });
});

describe("résultats de la palette", () => {
  it("actions d'abord, puis wordings (exemple fictif signalé), combattants, événements", () => {
    const entries = paletteEntries(
      [{ id: "mode-daily", label: "Passer en DAILY & MEDIA", shortcut: "Alt+D", keywords: "" }],
      {
        wordings: [
          {
            id: "w1",
            text: "\n💥 KO AU PREMIER ROUND !\n\nSuite",
            categoryId: "live_ko",
            mode: "live",
            isDemo: true,
          } as never,
        ],
        fighters: [
          { id: "f1", firstName: "Karim", lastName: "Fictif", nickname: "Le Marteau" } as never,
        ],
        events: [{ id: "e1", name: "HEXAGONE MMA", number: 12, city: "Paris" } as never],
      },
    );
    expect(entries.map((e) => [e.group, e.label, e.hint])).toEqual([
      ["Actions", "Passer en DAILY & MEDIA", "Alt+D"],
      ["Wordings", "💥 KO AU PREMIER ROUND !", "KO / TKO · LIVE SHOW · Exemple fictif"],
      ["Combattants", "Karim Fictif", "Le Marteau"],
      ["Événements", "HEXAGONE MMA 12", "Paris"],
    ]);
  });
});

describe("formats", () => {
  const now = new Date("2026-11-23T12:00:00.000Z");
  it("sauvegarde : « à l'instant », « il y a 3 s »…", () => {
    expect(formatRelative("2026-11-23T12:00:00.000Z", now)).toBe("à l'instant");
    expect(formatRelative("2026-11-23T11:59:57.000Z", now)).toBe("il y a 3 s");
    expect(formatRelative("2026-11-23T11:58:00.000Z", now)).toBe("il y a 2 min");
    expect(formatRelative("2026-11-23T08:00:00.000Z", now)).toBe("il y a 4 h");
  });

  it("fiche « À vérifier » au-delà de 90 jours", () => {
    expect(isStale("2026-09-01T00:00:00.000Z", now)).toBe(false);
    expect(isStale("2026-08-01T00:00:00.000Z", now)).toBe(true);
  });
});
