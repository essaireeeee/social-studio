"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ContextMenu, type MenuAction } from "./context-menu";

const ACTION_WIDTH = 80;
const DECIDE_PX = 8;

interface SwipeActionsProps {
  /** Glisser vers la droite : actions rapides (Planifier, Dupliquer…). */
  leading?: MenuAction[];
  /** Glisser vers la gauche : actions destructives (Supprimer), confirmées par l'appelant. */
  trailing?: MenuAction[];
  children: ReactNode;
  className?: string;
  /** Nom du menu contextuel équivalent. */
  label?: string;
}

/**
 * Actions par glissement sur une cellule (section 5.5). Au doigt : glisser à gauche révèle
 * les actions destructives, à droite les actions rapides. Souris et clavier : les mêmes
 * actions dans le menu contextuel (clic droit, touche Menu, `Maj+F10`).
 */
export function SwipeActions({
  leading = [],
  trailing = [],
  children,
  className,
  label,
}: SwipeActionsProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(
    null,
  );
  const swiped = useRef(false);
  const maxLeading = leading.length * ACTION_WIDTH;
  const maxTrailing = trailing.length * ACTION_WIDTH;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    gesture.current = { x: event.clientX, y: event.clientY, base: offset, horizontal: null };
    swiped.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.horizontal === null) {
      if (Math.abs(dx) + Math.abs(dy) < DECIDE_PX) return;
      g.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!g.horizontal) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    if (!g.horizontal) return;
    swiped.current = true;
    const next = Math.max(-maxTrailing - 32, Math.min(maxLeading + 32, g.base + dx));
    setOffset(next);
  };
  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g?.horizontal) return;
    if (offset > maxLeading / 2 && maxLeading > 0) setOffset(maxLeading);
    else if (offset < -maxTrailing / 2 && maxTrailing > 0) setOffset(-maxTrailing);
    else setOffset(0);
  };

  const run = (action: MenuAction) => {
    setOffset(0);
    action.onSelect();
  };
  const buttons = (actions: MenuAction[], side: "leading" | "trailing") => (
    <div
      className={cn("absolute inset-y-0 flex", side === "leading" ? "left-0" : "right-0")}
      aria-hidden="true"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          tabIndex={-1}
          disabled={action.disabled}
          onClick={() => run(action)}
          className={cn(
            "flex h-full w-20 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold text-white",
            action.destructive
              ? "bg-danger-fill"
              : side === "leading"
                ? "bg-[#007aff]"
                : "bg-[#7c7c82]",
          )}
        >
          {action.icon ? <action.icon className="size-5" aria-hidden="true" /> : null}
          {action.label}
        </button>
      ))}
    </div>
  );

  return (
    <ContextMenu actions={[...leading, ...trailing]} label={label}>
      <div className={cn("relative overflow-hidden", className)}>
        {offset > 0 ? buttons(leading, "leading") : null}
        {offset < 0 ? buttons(trailing, "trailing") : null}
        <div
          className={cn(
            "relative touch-pan-y bg-inherit",
            !dragging && "transition-transform duration-300 ease-out",
          )}
          style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(event) => {
            // Un glissement n'ouvre pas la cellule ; un toucher sur une cellule ouverte la referme.
            if (swiped.current || offset !== 0) {
              event.preventDefault();
              event.stopPropagation();
              swiped.current = false;
              if (offset !== 0 && !gesture.current) setOffset(0);
            }
          }}
        >
          {children}
        </div>
      </div>
    </ContextMenu>
  );
}
