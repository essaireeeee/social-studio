/**
 * Navigation de l'application (section 12.1). Une entrée dont l'écran n'existe pas encore
 * reste visible mais désactivée, avec la mention « Bientôt disponible » : rien de décoratif.
 * Passer `available` à vrai quand la phase correspondante livre l'écran.
 */
import type { Mode } from "@/types/domain";

export const COMING_SOON = "Bientôt disponible";

export type NavIcon =
  | "dashboard"
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
        label: "Dashboard",
        href: "/dashboard",
        icon: "dashboard",
        available: false,
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
        available: false,
      },
      {
        id: "fighters",
        label: "Combattants",
        href: "/fighters",
        icon: "fighters",
        available: false,
      },
      { id: "events", label: "Événements", href: "/events", icon: "events", available: false },
      {
        id: "hashtags",
        label: "Hashtags & signatures",
        href: "/hashtags",
        icon: "hashtags",
        available: false,
      },
      {
        id: "editorial",
        label: "ADN éditorial",
        href: "/editorial",
        icon: "editorial",
        available: true,
      },
    ],
  },
  {
    id: "tracking",
    label: "Suivi",
    items: [
      { id: "history", label: "Historique", href: "/history", icon: "history", available: false },
      {
        id: "validated",
        label: "Publications validées",
        href: "/validated",
        icon: "validated",
        available: false,
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
        available: false,
      },
      {
        id: "settings-data",
        label: "Gestion des données",
        href: "/settings/data",
        icon: "data",
        available: false,
      },
      {
        id: "settings-users",
        label: "Utilisateurs",
        href: "/settings/users",
        icon: "users",
        available: false,
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
