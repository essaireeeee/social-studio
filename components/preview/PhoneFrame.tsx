"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const PHONE_WIDTH = 375;

/**
 * Cadre téléphone sobre : 375 px logiques, mis à l'échelle pour tenir dans la colonne.
 * `theme` : apparence simulée du réseau (clair ou sombre), indépendante du thème de l'app.
 */
export function PhoneFrame({
  children,
  theme = "dark",
}: {
  children: ReactNode;
  theme?: "light" | "dark";
}) {
  const outer = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const width = outer.current?.clientWidth ?? PHONE_WIDTH;
      const next = Math.min(1, width / PHONE_WIDTH);
      setScale(next);
      setHeight((inner.current?.offsetHeight ?? 0) * next);
    });
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full" style={{ height }}>
      <div
        ref={inner}
        data-preview-theme={theme}
        className="overflow-hidden rounded-[28px] border border-border bg-[var(--pv-frame)] shadow-float"
        style={{
          width: PHONE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          marginLeft: scale < 1 ? 0 : `calc((100% - ${PHONE_WIDTH}px) / 2)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
