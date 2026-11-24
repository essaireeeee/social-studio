"use client";

import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast.store";

/** Zone des notifications, annoncées poliment aux lecteurs d'écran. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-md border bg-elevated px-3 py-2 text-13 shadow-lg",
            t.tone === "success" && "border-success/40 text-success",
            t.tone === "danger" && "border-danger/40 text-danger",
            t.tone === "neutral" && "border-border text-foreground",
          )}
        >
          <p>{t.message}</p>
          {t.action ? (
            <button
              type="button"
              className="cursor-pointer rounded-sm border border-current px-2 py-0.5 text-xs font-medium hover:bg-subtle"
              onClick={() => {
                dismiss(t.id);
                t.action!.onClick();
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
