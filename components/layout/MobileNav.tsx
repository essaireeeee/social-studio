"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useUiStore } from "@/stores/ui.store";
import { SidebarNav } from "./SidebarNav";

/** Navigation sur petit écran : panneau à gauche, ouvert depuis le header. */
export function MobileNav() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="right-auto left-0 max-w-72 border-r border-l-0 p-3">
        <SheetTitle className="px-2.5 pt-1 text-13">Navigation</SheetTitle>
        <nav aria-label="Navigation principale">
          <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
