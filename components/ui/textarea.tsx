"use client";

import { useLayoutEffect, useRef, type ComponentProps, type Ref } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends ComponentProps<"textarea"> {
  /** Hauteur ajustée au contenu. */
  autoResize?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, autoResize = false, value, ref, ...props }: TextareaProps) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const node = inner.current;
    if (!autoResize || !node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight + 2}px`;
  }, [autoResize, value]);
  return (
    <textarea
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      value={value}
      className={cn(
        "w-full min-w-0 rounded-md border border-input bg-background px-2.5 py-2 text-13 text-foreground accent-transition placeholder:text-muted-foreground hover:border-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        autoResize && "resize-none overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}
