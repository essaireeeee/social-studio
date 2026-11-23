"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { useRepository } from "@/hooks/useRepository";
import { cn } from "@/lib/utils";

/** Avatar du compte : le logo chargé dans Préférences, sinon un hexagone. */
export function PreviewAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const repository = useRepository();
  const logo = useLiveQuery(
    async () =>
      repository
        ? ((await repository.blobs.list({ filter: (b) => b.kind === "logo" })).at(0) ?? null)
        : null,
    [repository],
  );
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a2b31]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {logo ? (
        <Image
          src={`data:${logo.mimeType};base64,${logo.data}`}
          alt=""
          width={size}
          height={size}
          unoptimized
        />
      ) : (
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} aria-hidden="true">
          <path
            d="M12 2.5 20.2 7.25v9.5L12 21.5 3.8 16.75v-9.5Z"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1.75"
          />
        </svg>
      )}
    </span>
  );
}
