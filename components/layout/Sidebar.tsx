"use client";

import Link from "next/link";
import { useMode } from "@/hooks/useMode";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { Logo } from "./Logo";
import { ModeSwitcher } from "./ModeSwitcher";
import { SidebarNav } from "./SidebarNav";
import { StatusFooter } from "./StatusFooter";

/**
 * Sidebar façon iPadOS (section 5.5) : liste groupée sur fond `--bg-grouped`. Dès 1024 px,
 * visible et masquable entièrement (état mémorisé). Entre 768 et 1023 px, ouverte par-dessus
 * le contenu depuis la barre de navigation. Sous 768 px, la tab bar la remplace.
 */
export function Sidebar() {
  const { mode, setMode } = useMode();
  const overlay = useUiStore((s) => s.mobileNavOpen);
  const close = () => useUiStore.getState().setMobileNavOpen(false);

  return (
    <>
      {overlay ? (
        <div
          className="fixed inset-0 z-40 hidden bg-[var(--overlay)] md:block lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      ) : null}
      <aside
        id="app-sidebar"
        aria-label="Barre latérale"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] flex-col border-r-[0.5px] border-separator bg-bg-grouped pt-safe",
          overlay ? "hidden shadow-float md:flex" : "hidden",
          "lg:z-30 lg:flex lg:shadow-none lg:sidebar-collapsed:hidden",
        )}
      >
        <div className="flex flex-col gap-3 px-3 pt-3 pb-2">
          <Link
            href="/"
            onClick={close}
            className="flex h-9 items-center rounded-md px-2"
            aria-label="HEXAGONE MMA Social Studio : accueil"
          >
            <Logo />
          </Link>
          <ModeSwitcher mode={mode} onChange={setMode} block compact />
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav onNavigate={close} />
        </nav>
        <StatusFooter />
      </aside>
    </>
  );
}
