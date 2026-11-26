"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/lib/utils";
import { useToastStore, type Toast } from "@/stores/toast.store";

const ICONS = { success: CircleCheck, danger: CircleAlert, neutral: Info } as const;

function Banner({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const reduced = useReducedMotion();
  const Icon = ICONS[toast.tone];
  return (
    <motion.div
      layout
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -40 }}
      transition={reduced ? { duration: 0.1 } : { type: "spring", stiffness: 380, damping: 36 }}
      drag={reduced ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -24 || info.velocity.y < -300) onDismiss();
      }}
      className="pointer-events-auto flex w-full max-w-md touch-none items-center gap-3 rounded-2xl bg-surface-float px-4 py-3 text-subheadline shadow-float squircle"
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          toast.tone === "success" && "text-success",
          toast.tone === "danger" && "text-danger",
          toast.tone === "neutral" && "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-foreground">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-semibold text-accent-text hover:bg-fill pointer-coarse:min-h-11"
          onClick={() => {
            onDismiss();
            toast.action!.onClick();
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
    </motion.div>
  );
}

/**
 * Bannières (section 5.5, remplacent les toasts V1) : descendent du haut, se ferment seules
 * après 3 s (8 s avec une action) ou d'un glissement vers le haut. Annoncées poliment.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(0.5rem+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Banner key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
