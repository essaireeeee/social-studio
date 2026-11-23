"use client";

import { Globe, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { memo, useState } from "react";
import { truncateFacebook } from "@/lib/platforms/truncation";
import { CaptionText } from "./CaptionText";
import { PreviewAvatar } from "./PreviewAvatar";
import { PreviewMedia } from "./PreviewMedia";

interface FacebookPreviewProps {
  text: string;
  accountName: string;
  limit: number;
  wide: boolean;
}

/** Aperçu Facebook : en-tête de page, « Voir plus » simulé, média 1:1 ou 16:9. */
export const FacebookPreview = memo(function FacebookPreview({
  text,
  accountName,
  limit,
  wide,
}: FacebookPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const cut = truncateFacebook(text, limit);
  return (
    <div className="bg-[#18191a] text-[15px] leading-[20px] text-[#e4e6eb]">
      <div className="flex items-center gap-2.5 px-3 py-3">
        <PreviewAvatar size={40} />
        <span className="flex flex-col">
          <span className="font-semibold">{accountName}</span>
          <span className="flex items-center gap-1 text-[12px] text-[#b0b3b8]">
            À l&apos;instant · <Globe className="size-3" aria-hidden="true" />
          </span>
        </span>
      </div>
      <p className="px-3 pb-3 whitespace-pre-wrap">
        {expanded || !cut.truncated ? (
          <CaptionText text={text} linkClass="text-[#4599ff]" />
        ) : (
          <>
            <CaptionText text={cut.visible} linkClass="text-[#4599ff]" />…{" "}
            <button
              type="button"
              className="cursor-pointer font-semibold"
              onClick={() => setExpanded(true)}
            >
              Voir plus
            </button>
          </>
        )}
      </p>
      <PreviewMedia ratio={wide ? 16 / 9 : 1} />
      <div className="flex justify-around border-t border-[#3e4042] py-2 text-[13px] text-[#b0b3b8]">
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="size-4" aria-hidden="true" />
          J&apos;aime
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-4" aria-hidden="true" />
          Commenter
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 className="size-4" aria-hidden="true" />
          Partager
        </span>
      </div>
    </div>
  );
});
