"use client";

import { Library, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { COMING_SOON } from "@/lib/shell/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import type { Mode } from "@/types/domain";
import { EngineIndicator } from "./EngineIndicator";
import { Logo } from "./Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { SyncIndicator } from "./SyncIndicator";
import { UserBadge } from "./UserBadge";

const iconButton =
  "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground accent-transition hover:bg-subtle hover:text-foreground active:bg-subtle/70";

interface HeaderProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

/** Header fixe de 52 px (section 12.2) : logo, sélecteur de mode, recherche et indicateurs. */
export function Header({ mode, onModeChange }: HeaderProps) {
  const openCommand = () => useUiStore.getState().setCommandOpen(true);
  const openMobileNav = () => useUiStore.getState().setMobileNavOpen(true);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-13 items-center gap-2 border-b border-border bg-background px-2 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          onClick={openMobileNav}
          className={cn(iconButton, "md:hidden")}
          aria-label="Ouvrir la navigation"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
        <Link
          href="/"
          className="flex items-center rounded-md px-1 py-1"
          aria-label="HEXAGONE MMA Social Studio : accueil"
        >
          <Logo />
        </Link>
      </div>

      <ModeSwitcher mode={mode} onChange={onModeChange} />

      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={openCommand}
          aria-keyshortcuts="Control+K Meta+K"
          className={cn(
            iconButton,
            "w-auto gap-2 border border-border px-2 lg:min-w-44 lg:justify-start",
          )}
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden text-xs lg:inline">Rechercher</span>
          <Kbd className="ml-auto hidden lg:inline-flex">Ctrl K</Kbd>
          <span className="sr-only lg:hidden">Rechercher</span>
        </button>
        <Tooltip content={`Bibliothèque : ${COMING_SOON}`} side="bottom">
          <span
            className={cn(iconButton, "hidden cursor-not-allowed opacity-50 sm:flex")}
            aria-disabled="true"
            aria-label={`Bibliothèque (${COMING_SOON.toLowerCase()})`}
            role="link"
          >
            <Library className="size-4" aria-hidden="true" />
          </span>
        </Tooltip>
        <span className="hidden md:flex">
          <EngineIndicator />
        </span>
        <span className="hidden sm:flex">
          <SyncIndicator />
        </span>
        <Tooltip content="Paramètres" side="bottom">
          <Link href="/settings/ai" className={iconButton} aria-label="Paramètres">
            <Settings className="size-4" aria-hidden="true" />
          </Link>
        </Tooltip>
        <UserBadge />
      </div>
    </header>
  );
}
