"use client";

import { Bookmark, Ellipsis, Heart, MessageCircle, Send } from "lucide-react";
import { memo, useState } from "react";
import { truncateInstagram } from "@/lib/platforms/truncation";
import { CaptionText } from "./CaptionText";
import { PreviewAvatar } from "./PreviewAvatar";
import { PreviewMedia } from "./PreviewMedia";

interface InstagramPreviewProps {
  text: string;
  accountName: string;
  limit: number;
  visibleOnly: boolean;
  video: boolean;
}

/** Aperçu Instagram (section 13.5) : média 4:5, actions sans chiffre, coupure « … plus ». */
export const InstagramPreview = memo(function InstagramPreview({
  text,
  accountName,
  limit,
  visibleOnly,
  video,
}: InstagramPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const cut = truncateInstagram(text, limit);
  const showAll = expanded && !visibleOnly;

  return (
    <div className="bg-[var(--pv-bg)] text-[14px] leading-[18px] text-[var(--pv-text)]">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <PreviewAvatar size={32} />
        <span className="flex-1 font-semibold">{accountName}</span>
        <Ellipsis className="size-5" aria-hidden="true" />
      </div>
      <PreviewMedia ratio={4 / 5} video={video} />
      <div className="flex items-center gap-4 px-3 pt-3 pb-2 text-[var(--pv-icon)]">
        <Heart className="size-6" aria-hidden="true" />
        <MessageCircle className="size-6" aria-hidden="true" />
        <Send className="size-6" aria-hidden="true" />
        <Bookmark className="ml-auto size-6" aria-hidden="true" />
      </div>
      <div className="mx-3 mb-2 h-3 w-32 rounded-sm bg-[var(--pv-skeleton)]" aria-hidden="true" />
      <p className="px-3 pb-1 whitespace-pre-wrap" data-testid="ig-caption">
        <span className="font-semibold">{accountName}</span>{" "}
        {showAll || !cut.truncated ? (
          <>
            <CaptionText text={text} />
            {cut.truncated ? (
              <button
                type="button"
                className="ml-1 cursor-pointer text-[var(--pv-muted)]"
                onClick={() => setExpanded(false)}
              >
                moins
              </button>
            ) : null}
          </>
        ) : (
          <>
            <CaptionText text={cut.visible} />
            <button
              type="button"
              disabled={visibleOnly}
              className="cursor-pointer text-[var(--pv-muted)] disabled:cursor-default"
              onClick={() => setExpanded(true)}
            >
              … plus
            </button>
          </>
        )}
      </p>
      {visibleOnly && cut.truncated ? (
        <div
          className="mx-3 mb-2 h-10 rounded-sm bg-[var(--pv-media)]"
          aria-label="Partie masquée avant « plus »"
        />
      ) : null}
      <p className="px-3 pb-3 text-[11px] text-[var(--pv-muted)]">Il y a quelques secondes</p>
    </div>
  );
});
