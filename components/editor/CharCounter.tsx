"use client";

import { countForPlatform } from "@/lib/platforms/counters";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types/domain";

/**
 * Compteur de la plateforme principale (section 13.4). X : comptage pondéré officiel,
 * anneau orange à 260, rouge au-delà de 280. Autres : graphèmes.
 */
export function CharCounter({ text, platform }: { text: string; platform: Platform }) {
  const rule = PLATFORM_RULES[platform];
  const count = countForPlatform(text, platform);
  const over = count > rule.maxLength;
  const warn = rule.warnAt !== undefined && count >= rule.warnAt;
  const label =
    `${count} / ${rule.maxLength.toLocaleString("fr-FR")} caractères ${platform === "x" ? "(comptage X)" : ""}`.trim();

  if (platform !== "x") {
    return (
      <span
        className={cn("text-xs tabular-nums", over ? "text-danger" : "text-muted-foreground")}
        aria-label={label}
      >
        {count.toLocaleString("fr-FR")}
      </span>
    );
  }
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, count / rule.maxLength);
  const color = over ? "var(--danger)" : warn ? "var(--warning)" : "var(--accent)";
  return (
    <span className="flex items-center gap-1.5" aria-label={label}>
      <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
        <circle cx="10" cy="10" r={radius} fill="none" stroke="var(--border)" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span
        className={cn(
          "text-xs tabular-nums",
          over ? "text-danger" : warn ? "text-warning" : "text-muted-foreground",
        )}
      >
        {over ? `−${count - rule.maxLength}` : rule.maxLength - count}
      </span>
    </span>
  );
}
