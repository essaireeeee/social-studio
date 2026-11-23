"use client";

import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMode, useModeSync } from "@/hooks/useMode";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useStudioStore } from "@/stores/studio.store";
import { CommandSearch } from "./CommandSearch";
import { EndSessionDialog } from "./EndSessionDialog";
import { Header } from "./Header";
import { LiveSessionBar } from "./LiveSessionBar";
import { LiveSessionDialog } from "./LiveSessionDialog";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

/**
 * Shell de l'application (section 12) : header fixe, barre latérale, barre Session Live en
 * LIVE SHOW, palette de commandes. Raccourcis globaux : `Alt+L`, `Alt+D`, `Cmd/Ctrl+K`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { mode, setMode } = useMode();
  useModeSync();
  useShortcuts(setMode);
  // Brouillon du Studio relu une fois, après le montage (rendus serveur et client identiques).
  useEffect(() => {
    void useStudioStore.persist.rehydrate();
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <a
        href="#contenu"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-accent px-3 py-2 text-13 font-medium text-accent-foreground focus-visible:translate-y-0"
      >
        Aller au contenu
      </a>
      <Header mode={mode} onModeChange={setMode} />
      <Sidebar />
      <MobileNav />
      <div className="pt-13 md:pl-[232px] md:sidebar-collapsed:pl-14">
        {mode === "live" ? <LiveSessionBar /> : null}
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>
      <CommandSearch mode={mode} onModeChange={setMode} />
      <LiveSessionDialog />
      <EndSessionDialog />
      <Toaster />
    </TooltipProvider>
  );
}
