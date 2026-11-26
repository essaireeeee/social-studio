"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMode, useModeSync } from "@/hooks/useMode";
import { useShellGestures } from "@/hooks/useShellGestures";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useStudioStore } from "@/stores/studio.store";
import { CommandSearch } from "./CommandSearch";
import { EndSessionDialog } from "./EndSessionDialog";
import { LiveSessionBar } from "./LiveSessionBar";
import { LiveSessionDialog } from "./LiveSessionDialog";
import { ModeSwitcher } from "./ModeSwitcher";
import { NavigationBar } from "./NavigationBar";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";

/** Écrans où le mode change ce qui s'affiche : sélecteur en tête sur mobile et tablette. */
const MODE_SCREENS = new Set(["/", "/studio"]);

/**
 * Shell V2 (section 5.5) : barre de navigation translucide, sidebar iPadOS dès 1024 px,
 * tab bar sous 768 px, barre Session Live en LIVE SHOW, palette de commandes.
 * Raccourcis globaux : `Alt+L`, `Alt+D`, `Cmd/Ctrl+K`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { mode, setMode } = useMode();
  const pathname = usePathname();
  useModeSync();
  useShortcuts(setMode);
  useShellGestures();
  // Brouillon du Studio relu une fois, après le montage (rendus serveur et client identiques).
  useEffect(() => {
    void useStudioStore.persist.rehydrate();
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <a
        href="#contenu"
        className="fixed top-2 left-2 z-[60] -translate-y-20 rounded-md bg-accent px-3 py-2 text-13 font-medium text-accent-foreground focus-visible:translate-y-0"
      >
        Aller au contenu
      </a>
      <Sidebar />
      <NavigationBar />
      <div className="min-h-dvh pt-[calc(2.75rem+env(safe-area-inset-top))] pb-[calc(49px+env(safe-area-inset-bottom))] md:pb-0 lg:pt-[52px] lg:pl-[260px] lg:sidebar-collapsed:pl-0">
        {mode === "live" ? <LiveSessionBar /> : null}
        {MODE_SCREENS.has(pathname) ? (
          <div className="px-4 pt-3 sm:px-6 lg:hidden">
            <ModeSwitcher mode={mode} onChange={setMode} block />
          </div>
        ) : null}
        <main id="contenu" tabIndex={-1} className="outline-none">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <TabBar />
      <CommandSearch mode={mode} onModeChange={setMode} />
      <LiveSessionDialog />
      <EndSessionDialog />
      <Toaster />
    </TooltipProvider>
  );
}
