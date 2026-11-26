/**
 * Navigation de l'application (section 12.1). Une entrée dont l'écran n'existe pas encore
 * reste visible mais désactivée, avec la mention « Bientôt disponible » : rien de décoratif.
 * Passer `available` à vrai quand la phase correspondante livre l'écran.
 */
import type { Mode } from "@/types/domain";

export const COMING_SOON = "Bientôt disponible";

export type NavIcon =
  | "dashboard"
  | "calendar"
  | "ideas"
  | "french"
  | "campaigns"
  | "more"
  | "settings"
  | "studio"
  | "live"
  | "daily"
  | "library"
  | "fighters"
  | "events"
  | "hashtags"
  | "editorial"
  | "history"
  | "validated"
  | "ai"
  | "preferences"
  | "data"
  | "users";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
  /** Faux : écran prévu dans une phase ultérieure. */
  available: boolean;
  /** Ouvre le Studio dans ce mode. */
  mode?: Mode;
}

export interface NavSection {
  id: string;
  label: string;
  items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "dashboard",
        label: "Accueil",
        href: "/",
        icon: "dashboard",
        available: true,
      },
      { id: "studio", label: "Social Studio", href: "/studio", icon: "studio", available: true },
      {
        id: "studio-live",
        label: "LIVE SHOW",
        href: "/studio?mode=live",
        icon: "live",
        available: true,
        mode: "live",
      },
      {
        id: "studio-daily",
        label: "DAILY & MEDIA",
        href: "/studio?mode=daily",
        icon: "daily",
        available: true,
        mode: "daily",
      },
      // V2 : écrans livrés aux phases V2-3 (calendrier) et V2-5 (idées).
      {
        id: "calendar",
        label: "Calendrier",
        href: "/calendar",
        icon: "calendar",
        available: false,
      },
      { id: "ideas", label: "Idées", href: "/ideas", icon: "ideas", available: false },
    ],
  },
  {
    id: "resources",
    label: "Ressources",
    items: [
      {
        id: "library",
        label: "Bibliothèque de wordings",
        href: "/library",
        icon: "library",
        available: true,
      },
      {
        id: "fighters",
        label: "Combattants",
        href: "/fighters",
        icon: "fighters",
        available: true,
      },
      { id: "events", label: "Événements", href: "/events", icon: "events", available: true },
      {
        id: "hashtags",
        label: "Hashtags & signatures",
        href: "/hashtags",
        icon: "hashtags",
        available: true,
      },
      {
        id: "editorial",
        label: "ADN éditorial",
        href: "/editorial",
        icon: "editorial",
        available: true,
      },
      // V2 : phases V2-2 (Atelier Français) et V2-4 (campagnes).
      {
        id: "french",
        label: "Atelier Français",
        href: "/french",
        icon: "french",
        available: false,
      },
      {
        id: "campaigns",
        label: "Campagnes",
        href: "/campaigns",
        icon: "campaigns",
        available: false,
      },
    ],
  },
  {
    id: "tracking",
    label: "Suivi",
    items: [
      { id: "history", label: "Historique", href: "/history", icon: "history", available: true },
      {
        id: "validated",
        label: "Publications validées",
        href: "/validated",
        icon: "validated",
        available: true,
      },
    ],
  },
  {
    id: "settings",
    label: "Paramètres",
    items: [
      {
        id: "settings-ai",
        label: "Intelligence artificielle",
        href: "/settings/ai",
        icon: "ai",
        available: true,
      },
      {
        id: "settings-preferences",
        label: "Préférences",
        href: "/settings/preferences",
        icon: "preferences",
        available: true,
      },
      {
        id: "settings-data",
        label: "Gestion des données",
        href: "/settings/data",
        icon: "data",
        available: true,
      },
      {
        id: "settings-users",
        label: "Utilisateurs",
        href: "/settings/users",
        icon: "users",
        available: true,
      },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export function navItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.id === id);
}

/**
 * Entrée active : même chemin, ou sous-chemin. Dans le Studio, c'est l'entrée du mode actif
 * (LIVE SHOW ou DAILY & MEDIA) qui est marquée, pas « Social Studio ».
 */
export function isActive(item: NavItem, pathname: string, mode?: Mode): boolean {
  const path = item.href.split("?")[0]!;
  if (path === "/studio" && pathname === "/studio")
    return item.mode !== undefined && item.mode === mode;
  return pathname === path || pathname.startsWith(`${path}/`);
}

// ---------------------------------------------------------------------------
// V2 : tab bar, écran Plus, titres et retour (section 5.5 et 5.8 de PROMPT_V2.md)
// ---------------------------------------------------------------------------

export interface TabItem {
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
  available: boolean;
}

/** Tab bar mobile (< 768 px) : Accueil, Studio, Calendrier, Idées, Plus. */
export const TAB_ITEMS: readonly TabItem[] = [
  { id: "home", label: "Accueil", href: "/", icon: "dashboard", available: true },
  { id: "studio", label: "Studio", href: "/studio", icon: "studio", available: true },
  { id: "calendar", label: "Calendrier", href: "/calendar", icon: "calendar", available: false },
  { id: "ideas", label: "Idées", href: "/ideas", icon: "ideas", available: false },
  { id: "more", label: "Plus", href: "/plus", icon: "more", available: true },
];

/** Écran Plus : cellules groupées, dans l'ordre de la section 5.8. */
export const MORE_ITEMS: readonly NavItem[] = [
  "library",
  "fighters",
  "events",
  "hashtags",
  "editorial",
  "french",
  "campaigns",
  "history",
  "validated",
]
  .map((id) => navItem(id)!)
  .concat([
    { id: "settings", label: "Paramètres", href: "/settings", icon: "settings", available: true },
  ]);

/** Sections de Paramètres, en cellules groupées. */
export const SETTINGS_ITEMS: readonly NavItem[] = NAV_SECTIONS.find(
  (section) => section.id === "settings",
)!.items;

/** Écrans atteints depuis l'onglet Plus sur mobile. */
const MORE_PATHS = new Set(MORE_ITEMS.map((item) => item.href));

/** Onglet actif de la tab bar. */
export function activeTab(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/studio" || pathname.startsWith("/studio/")) return "studio";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/ideas")) return "ideas";
  return "more";
}

const TITLES: Record<string, string> = {
  "/": "Accueil",
  "/studio": "Studio",
  "/plus": "Plus",
  "/settings": "Paramètres",
  "/library": "Bibliothèque",
};

/** Titre de l'écran dans la barre de navigation. */
export function screenTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]!;
  const item = NAV_ITEMS.find((i) => !i.mode && i.href === pathname);
  return item?.label ?? "Social Studio";
}

export interface BackLink {
  label: string;
  href: string;
}

/**
 * Bouton retour « ‹ Précédent » : écran parent. Les sections de Paramètres remontent à
 * Paramètres ; sur mobile, les écrans de l'onglet Plus remontent à Plus.
 */
export function parentOf(pathname: string, mobile: boolean): BackLink | null {
  if (pathname.startsWith("/settings/")) return { label: "Paramètres", href: "/settings" };
  if (!mobile) return null;
  if (pathname === "/settings" || MORE_PATHS.has(pathname)) return { label: "Plus", href: "/plus" };
  return null;
}
