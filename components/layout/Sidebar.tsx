"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/useSidebar";
import { SidebarNav } from "./SidebarNav";

/**
 * Barre latérale (section 12.1) : 232 px, repliée à 56 px (icônes et infobulles).
 * Sur petit écran, la même navigation passe dans le menu du header (`MobileNav`).
 */
export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  return (
    <aside
      id="app-sidebar"
      className="fixed top-13 bottom-0 left-0 z-30 hidden w-[232px] flex-col border-r border-border bg-background md:flex sidebar-collapsed:w-14"
    >
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-2 py-3">
        <SidebarNav collapsed={collapsed} />
      </nav>
      <div className="border-t border-border p-2">
        <Tooltip content="Déplier la barre latérale" enabled={collapsed}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-13 text-muted-foreground accent-transition hover:bg-subtle hover:text-foreground active:bg-subtle/70 sidebar-collapsed:justify-center sidebar-collapsed:px-0"
          >
            <PanelLeftClose className="size-4 sidebar-collapsed:hidden" aria-hidden="true" />
            <PanelLeftOpen className="hidden size-4 sidebar-collapsed:block" aria-hidden="true" />
            <span className="sidebar-collapsed:sr-only">
              {collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            </span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
