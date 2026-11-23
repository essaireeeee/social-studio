import { memo } from "react";

const TOKEN = /(#[\p{L}\p{N}_]+|@[\p{L}\p{N}_.]+)/gu;

/** Légende : hashtags et mentions en couleur lien, sauts de ligne conservés. */
export const CaptionText = memo(function CaptionText({
  text,
  linkClass = "text-[#4f8cff]",
}: {
  text: string;
  linkClass?: string;
}) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className={linkClass}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
});
