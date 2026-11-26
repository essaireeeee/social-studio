"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { COMING_SOON, TAB_ITEMS, activeTab } from "@/lib/shell/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";
import { NavIcon } from "./NavIcon";

/**
 * Tab bar mobile (< 768 px, section 5.5) : fixe en bas, translucide, au-dessus de la zone
 * sûre. Onglet actif en accent. Toucher l'onglet actif remonte en haut de l'écran.
 * Masquée pendant la saisie au clavier.
 */
export function TabBar({ badges = {} }: { badges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const active = activeTab(pathname);
  const keyboardOpen = useUiStore((s) => s.keyboardOpen);

  const onActiveTap = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname !== href) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Onglets"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t-[0.5px] border-separator bar-material pb-safe md:hidden",
        keyboardOpen && "hidden",
      )}
    >
      <ul className="grid h-[49px] grid-cols-5">
        {TAB_ITEMS.map((tab) => {
          const current = tab.id === active;
          const badge = badges[tab.id];
          const content = (
            <>
              <span className="relative">
                <NavIcon name={tab.icon} className="size-6" />
                {badge ? (
                  <span className="absolute -top-1 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fill px-1 text-[11px] font-semibold text-white">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] leading-3 font-medium">{tab.label}</span>
            </>
          );
          const cell = "flex h-full flex-col items-center justify-center gap-0.5";
          return (
            <li key={tab.id}>
              {tab.available ? (
                <Link
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  onClick={(event) => onActiveTap(event, tab.href)}
                  className={cn(cell, current ? "text-accent-text" : "text-muted-foreground")}
                >
                  {content}
                </Link>
              ) : (
                <span
                  role="link"
                  aria-disabled="true"
                  aria-label={`${tab.label} (${COMING_SOON.toLowerCase()})`}
                  className={cn(cell, "cursor-not-allowed text-muted-foreground opacity-40")}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
