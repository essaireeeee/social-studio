"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { COMING_SOON, NAV_SECTIONS, isActive, type NavItem } from "@/lib/shell/navigation";
import { cn } from "@/lib/utils";
import { NavIcon } from "./NavIcon";

interface SidebarNavProps {
  /** Barre repliée : icônes seules, libellés en infobulle. */
  collapsed: boolean;
  onNavigate?: () => void;
}

const itemClass =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-13 accent-transition sidebar-collapsed:justify-center sidebar-collapsed:px-0";

function Item({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const icon = (
    <NavIcon
      name={item.icon}
      className={cn(
        "size-4 shrink-0",
        item.mode === "live" && "text-live",
        item.mode === "daily" && "text-daily",
      )}
    />
  );
  const label = <span className="truncate sidebar-collapsed:sr-only">{item.label}</span>;

  if (!item.available) {
    return (
      <Tooltip content={`${item.label} : ${COMING_SOON}`} enabled>
        <span
          className={cn(itemClass, "cursor-not-allowed text-muted-foreground/60")}
          aria-disabled="true"
          aria-label={`${item.label} (${COMING_SOON.toLowerCase()})`}
          role="link"
        >
          {icon}
          {label}
          <span className="ml-auto shrink-0 text-[10px] tracking-wide uppercase sidebar-collapsed:hidden">
            Bientôt
          </span>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={item.label} enabled={collapsed}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          itemClass,
          active
            ? "bg-subtle font-medium text-foreground"
            : "text-muted-foreground hover:bg-subtle hover:text-foreground active:bg-subtle/70",
        )}
      >
        {icon}
        {label}
        {active ? (
          <span
            className="ml-auto size-1.5 rounded-full bg-accent sidebar-collapsed:hidden"
            aria-hidden="true"
          />
        ) : null}
      </Link>
    </Tooltip>
  );
}

/** Sections de navigation (section 12.1), communes à la barre latérale et au menu mobile. */
export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-4">
      {NAV_SECTIONS.map((section) => (
        <div
          key={section.id}
          className="flex flex-col gap-0.5"
          role="group"
          aria-labelledby={`nav-${section.id}`}
        >
          <p
            id={`nav-${section.id}`}
            className="px-2.5 pb-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground/70 uppercase sidebar-collapsed:sr-only"
          >
            {section.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <Item
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item, pathname)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
