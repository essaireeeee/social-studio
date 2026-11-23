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
    <div className="flex gap-3 bg-black px-4 py-3 text-[15px] leading-[20px] text-[#e7e9ea]">
      <PreviewAvatar size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex gap-1 text-[15px]">
          <span className="font-bold">HEXAGONE MMA</span>
          <span className="truncate text-[#71767b]">@{accountName} · 1 s</span>
        </p>
        <p className="whitespace-pre-wrap">
          <CaptionText text={valid} linkClass="text-[#1d9bf0]" />
          {overflow ? <mark className="bg-[#f4212e]/30 text-[#f4212e]">{overflow}</mark> : null}
        </p>
        <p
          className={cn(
            "text-[13px] font-semibold tabular-nums",
            weightedLength > 280
              ? "text-[#f4212e]"
              : weightedLength >= 260
                ? "text-[#ffd400]"
                : "text-[#71767b]",
          )}
        >
          {weightedLength} / 280
        </p>
        <div className="flex justify-between pt-1 text-[#71767b]">
          <MessageCircle className="size-4" aria-hidden="true" />
          <Repeat2 className="size-4" aria-hidden="true" />
          <Heart className="size-4" aria-hidden="true" />
          <BarChart2 className="size-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
});
