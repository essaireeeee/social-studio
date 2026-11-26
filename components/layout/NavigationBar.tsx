"use client";

import { ChevronLeft, PanelLeft, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kbd } from "@/components/ui/kbd";
import { useIsMobile } from "@/hooks/useMedia";
import { useSidebar } from "@/hooks/useSidebar";
import { parentOf, screenTitle } from "@/lib/shell/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { MoreMenu } from "./MoreMenu";
import { ThemeToggle } from "./ThemeToggle";

const iconButton =
  "flex size-9 cursor-pointer items-center justify-center rounded-full text-accent-text hover:bg-fill active:opacity-60 pointer-coarse:size-11";

/**
 * Barre de navigation (section 5.5) : fixe, translucide. Retour « ‹ Parent » à gauche, petit
 * titre centré quand le grand titre de l'écran a défilé, deux actions à droite au plus
 * (recherche et thème sur desktop ; thème et menu « ⋯ » sur mobile).
 */
export function NavigationBar() {
  const pathname = usePathname();
  const mobile = useIsMobile();
  const back = parentOf(pathname, mobile);
  const largeTitle = useUiStore((s) => s.largeTitleVisible);
  const { collapsed, toggle } = useSidebar();
  const title = screenTitle(pathname);

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) toggle();
    else useUiStore.getState().setMobileNavOpen(true);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b-[0.5px] border-separator bar-material pt-safe lg:left-[260px] lg:sidebar-collapsed:left-0">
      <div className="relative flex h-11 items-center gap-1 px-2 lg:h-[52px] lg:px-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(iconButton, "hidden md:flex")}
          aria-controls="app-sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Afficher la barre latérale" : "Masquer la barre latérale"}
        >
          <PanelLeft className="size-5" aria-hidden="true" />
        </button>
        {back ? (
          <Link
            href={back.href}
            className="flex h-11 min-w-0 items-center gap-0.5 rounded-md pr-2 text-body text-accent-text hover:opacity-70"
          >
            <ChevronLeft className="size-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span className="truncate">{back.label}</span>
          </Link>
        ) : null}

        <p
          className={cn(
            "pointer-events-none absolute left-1/2 max-w-[50%] -translate-x-1/2 truncate text-[17px] font-semibold text-foreground transition-opacity duration-200",
            largeTitle ? "opacity-0" : "opacity-100",
          )}
          aria-hidden={largeTitle}
        >
          {title}
        </p>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => useUiStore.getState().setCommandOpen(true)}
            aria-keyshortcuts="Control+K Meta+K"
            className="hidden h-9 cursor-pointer items-center gap-2 rounded-md bg-fill px-3 text-13 text-muted-foreground hover:text-foreground md:flex lg:min-w-52"
          >
            <Search className="size-4" aria-hidden="true" />
            <span>Rechercher</span>
            <Kbd className="ml-auto hidden lg:inline-flex">Ctrl K</Kbd>
          </button>
          <ThemeToggle />
          <span className="md:hidden">
            <MoreMenu />
          </span>
        </div>
      </div>
    </header>
  );
}
