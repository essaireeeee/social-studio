"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { COMING_SOON, NAV_SECTIONS, isActive, type NavItem } from "@/lib/shell/navigation";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio.store";
import { NavIcon } from "./NavIcon";

const itemClass =
  "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-body accent-transition lg:h-9";

function Item({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const icon = (
    <NavIcon
      name={item.icon}
      className={cn(
        "size-[18px] shrink-0",
        item.mode === "live"
          ? "text-live-text"
          : item.mode === "daily"
            ? "text-daily-text"
            : active
              ? "text-accent-text"
              : "text-muted-foreground",
      )}
    />
  );

  if (!item.available) {
    return (
      <span
        className={cn(itemClass, "cursor-not-allowed text-muted-foreground")}
        aria-disabled="true"
        role="link"
        title={COMING_SOON}
      >
        <span className="opacity-50">{icon}</span>
        <span className="truncate opacity-60">{item.label}</span>
        <span className="ml-auto shrink-0 text-caption text-muted-foreground">
          Bientôt<span className="sr-only"> disponible</span>
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClass,
        active
          ? "bg-fill font-semibold text-foreground"
          : "text-foreground hover:bg-fill/60 active:bg-fill",
      )}
    >
      {icon}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Navigation de la sidebar iPadOS : sections repliables, élément actif en pilule `--fill`. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const mode = useStudioStore((s) => s.mode);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-4">
      {NAV_SECTIONS.map((section) => {
        const open = !closed[section.id];
        const listId = `nav-list-${section.id}`;
        return (
          <div
            key={section.id}
            className="flex flex-col gap-0.5"
            role="group"
            aria-labelledby={`nav-${section.id}`}
          >
            <button
              id={`nav-${section.id}`}
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setClosed((c) => ({ ...c, [section.id]: open }))}
              className="flex h-8 cursor-pointer items-center justify-between rounded-md px-3 text-footnote font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
            >
              {section.label}
              <ChevronDown
                className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
                aria-hidden="true"
              />
            </button>
            <ul id={listId} hidden={!open} className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <Item
                    item={item}
                    active={isActive(item, pathname, mode)}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
