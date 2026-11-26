import { describe, expect, it } from "vitest";
import { THEME_COLORS, isThemeChoice, resolveTheme, toggledTheme } from "@/lib/design/theme";
import {
  MORE_ITEMS,
  SETTINGS_ITEMS,
  TAB_ITEMS,
  activeTab,
  parentOf,
  screenTitle,
} from "@/lib/shell/navigation";
import { PREPAINT_SCRIPT } from "@/lib/shell/shortcuts";

describe("thèmes (section 5.1)", () => {
  it("Automatique suit le système ; Jour et Nuit s'imposent", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("le bouton soleil / lune bascule vers le thème opposé", () => {
    expect(toggledTheme("light")).toBe("dark");
    expect(toggledTheme("dark")).toBe("light");
  });

  it("valide les choix enregistrés", () => {
    expect(isThemeChoice("system")).toBe(true);
    expect(isThemeChoice("octogon")).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
  });

  it("le script d'en-tête pose data-theme et la couleur de barre avant l'affichage", () => {
    expect(PREPAINT_SCRIPT).toContain('localStorage.getItem("hex-theme")');
    expect(PREPAINT_SCRIPT).toContain('"(prefers-color-scheme: dark)"');
    expect(PREPAINT_SCRIPT).toContain('d.setAttribute("data-theme",t)');
    expect(PREPAINT_SCRIPT).toContain(THEME_COLORS.dark);
    expect(PREPAINT_SCRIPT).toMatch(/try\{.*\}catch\(e\)\{\}/);
  });
});

describe("tab bar et écran Plus (sections 5.5 et 5.8)", () => {
  it("cinq onglets : Accueil, Studio, Calendrier, Idées, Plus", () => {
    expect(TAB_ITEMS.map((t) => t.label)).toEqual([
      "Accueil",
      "Studio",
      "Calendrier",
      "Idées",
      "Plus",
    ]);
    // Calendrier (V2-3) et Idées (V2-5) ne sont pas encore livrés.
    expect(TAB_ITEMS.filter((t) => !t.available).map((t) => t.id)).toEqual(["calendar", "ideas"]);
  });

  it("onglet actif selon l'écran", () => {
    expect(activeTab("/")).toBe("home");
    expect(activeTab("/studio")).toBe("studio");
    expect(activeTab("/calendar")).toBe("calendar");
    expect(activeTab("/library")).toBe("more");
    expect(activeTab("/settings/ai")).toBe("more");
  });

  it("Plus liste les écrans de la section 5.8, dans l'ordre", () => {
    expect(MORE_ITEMS.map((i) => i.label)).toEqual([
      "Bibliothèque de wordings",
      "Combattants",
      "Événements",
      "Hashtags & signatures",
      "ADN éditorial",
      "Atelier Français",
      "Campagnes",
      "Historique",
      "Publications validées",
      "Paramètres",
    ]);
    expect(SETTINGS_ITEMS.map((i) => i.href)).toEqual([
      "/settings/ai",
      "/settings/preferences",
      "/settings/data",
      "/settings/users",
    ]);
  });
});

describe("barre de navigation : titre et retour", () => {
  it("titre de chaque écran", () => {
    expect(screenTitle("/")).toBe("Accueil");
    expect(screenTitle("/library")).toBe("Bibliothèque");
    expect(screenTitle("/settings/data")).toBe("Gestion des données");
    expect(screenTitle("/inconnu")).toBe("Social Studio");
  });

  it("« ‹ Paramètres » depuis une section ; « ‹ Plus » sur mobile seulement", () => {
    expect(parentOf("/settings/ai", false)).toEqual({ label: "Paramètres", href: "/settings" });
    expect(parentOf("/settings/ai", true)).toEqual({ label: "Paramètres", href: "/settings" });
    expect(parentOf("/library", true)).toEqual({ label: "Plus", href: "/plus" });
    expect(parentOf("/settings", true)).toEqual({ label: "Plus", href: "/plus" });
    expect(parentOf("/library", false)).toBeNull();
    expect(parentOf("/", true)).toBeNull();
    expect(parentOf("/studio", true)).toBeNull();
  });
});
