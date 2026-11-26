"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";

/**
 * Grand titre d'écran (Large Title, section 5.5). Tant qu'il est visible, la barre de
 * navigation n'affiche pas de titre ; dès qu'il passe sous la barre, elle affiche le titre
 * centré de 17 px (`IntersectionObserver`).
 */
export function LargeTitle({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const node = ref.current;
    const setVisible = useUiStore.getState().setLargeTitleVisible;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      // La barre de navigation (44 à 52 px, plus la zone sûre) recouvre le haut de la page.
      { rootMargin: "-52px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setVisible(false);
    };
  }, []);
  return (
    <h1 ref={ref} className={cn("text-large-title tracking-tight text-foreground", className)}>
      {children}
    </h1>
  );
}

/** En-tête d'écran : grand titre, sous-titre et actions (à droite sur desktop). */
export function ScreenTitle({
  children,
  subtitle,
  actions,
  className,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 pt-1 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <LargeTitle>{children}</LargeTitle>
        {subtitle ? (
          <p className="max-w-3xl text-subheadline text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
