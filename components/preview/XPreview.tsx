"use client";

import { BarChart2, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { memo } from "react";
import { xSplit } from "@/lib/platforms/counters";
import { cn } from "@/lib/utils";
import { CaptionText } from "./CaptionText";
import { PreviewAvatar } from "./PreviewAvatar";

/** Aperçu X : compteur pondéré bien visible, partie au-delà de 280 en rouge. */
export const XPreview = memo(function XPreview({
  text,
  accountName,
}: {
  text: string;
  accountName: string;
}) {
  const { valid, overflow, weightedLength } = xSplit(text);
  return (
    <div className="flex gap-3 bg-[var(--pv-bg)] px-4 py-3 text-[15px] leading-[20px] text-[var(--pv-x-text)]">
      <PreviewAvatar size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex gap-1 text-[15px]">
          <span className="font-bold">HEXAGONE MMA</span>
          <span className="truncate text-[var(--pv-x-muted)]">@{accountName} · 1 s</span>
        </p>
        <p className="whitespace-pre-wrap">
          <CaptionText text={valid} linkClass="text-[var(--pv-x-link)]" />
          {overflow ? (
            <mark className="bg-[color-mix(in_srgb,var(--pv-x-danger)_25%,transparent)] text-[var(--pv-x-danger)]">
              {overflow}
            </mark>
          ) : null}
        </p>
        <p
          className={cn(
            "text-[13px] font-semibold tabular-nums",
            weightedLength > 280
              ? "text-[var(--pv-x-danger)]"
              : weightedLength >= 260
                ? "text-[var(--pv-x-warn)]"
                : "text-[var(--pv-x-muted)]",
          )}
        >
          {weightedLength} / 280
        </p>
        <div className="flex justify-between pt-1 text-[var(--pv-x-muted)]">
          <MessageCircle className="size-4" aria-hidden="true" />
          <Repeat2 className="size-4" aria-hidden="true" />
          <Heart className="size-4" aria-hidden="true" />
          <BarChart2 className="size-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
});
