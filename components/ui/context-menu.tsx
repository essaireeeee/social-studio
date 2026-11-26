"use client";

import type { LucideIcon } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MenuAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

const LONG_PRESS_MS = 500;

/**
 * Menu contextuel (section 5.5) : clic droit sur desktop, appui long de 500 ms sur mobile,
 * touche Menu ou `Maj+F10` au clavier (Radix). Les actions destructives sont en rouge.
 */
export function ContextMenu({
  actions,
  children,
  label,
}: {
  actions: MenuAction[];
  children: ReactNode;
  label?: string;
}) {
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    const target = event.currentTarget;
    const { clientX, clientY } = event;
    clear();
    timer.current = window.setTimeout(() => {
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX, clientY }));
    }, LONG_PRESS_MS);
  };

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger
        asChild
        onPointerDown={onPointerDown}
        onPointerUp={clear}
        onPointerCancel={clear}
        onPointerMove={(event) => {
          if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) clear();
        }}
      >
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          aria-label={label}
          className="z-50 min-w-56 overflow-hidden rounded-xl bg-surface-float py-1 shadow-float squircle data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {actions.map((action) => (
            <ContextMenuPrimitive.Item
              key={action.label}
              disabled={action.disabled}
              onSelect={action.onSelect}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-between gap-6 px-4 text-body outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-fill md:min-h-9",
                action.destructive ? "text-danger" : "text-foreground",
              )}
            >
              {action.label}
              {action.icon ? <action.icon className="size-4" aria-hidden="true" /> : null}
            </ContextMenuPrimitive.Item>
          ))}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
