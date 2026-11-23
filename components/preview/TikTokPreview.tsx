"use client";

import { Bookmark, Heart, MessageCircle, Share } from "lucide-react";
import { memo, useState } from "react";
import { truncateTikTok } from "@/lib/platforms/truncation";
import { CaptionText } from "./CaptionText";
import { PreviewAvatar } from "./PreviewAvatar";
import { PreviewMedia } from "./PreviewMedia";

/** Aperçu TikTok : 9:16, légende en surimpression sur deux lignes, icônes à droite. */
export const TikTokPreview = memo(function TikTokPreview({
  text,
  accountName,
}: {
  text: string;
  accountName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cut = truncateTikTok(text);
  return (
    <div className="relative text-[13px] leading-[18px] text-white">
      <PreviewMedia ratio={9 / 16} video />
      <div
        className="absolute right-2 bottom-24 flex flex-col items-center gap-5"
        aria-hidden="true"
      >
        <PreviewAvatar size={40} className="border border-white" />
        <Heart className="size-7" />
        <MessageCircle className="size-7" />
        <Bookmark className="size-7" />
        <Share className="size-7" />
      </div>
      <div className="absolute right-16 bottom-4 left-3 flex flex-col gap-1 drop-shadow">
        <span className="font-semibold">@{accountName}</span>
        <p className="whitespace-pre-wrap">
          {expanded || !cut.truncated ? (
            <CaptionText text={text} linkClass="font-semibold" />
          ) : (
            <>
              <CaptionText text={cut.visible} linkClass="font-semibold" />…{" "}
              <button
                type="button"
                className="cursor-pointer font-semibold"
                onClick={() => setExpanded(true)}
              >
                plus
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
});
