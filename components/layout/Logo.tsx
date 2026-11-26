"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { useRepository } from "@/hooks/useRepository";

/** Hexagone sobre, en attendant un logo chargé dans Préférences. */
function Placeholder() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 text-accent-text accent-transition"
      aria-hidden="true"
    >
      <path
        d="M12 2.5 20.2 7.25v9.5L12 21.5 3.8 16.75v-9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Logo HEXAGONE MMA (image `logo` en base, sinon l'hexagone) et « SOCIAL STUDIO ». */
export function Logo() {
  const repository = useRepository();
  const logo = useLiveQuery(
    async () =>
      repository
        ? ((await repository.blobs.list({ filter: (b) => b.kind === "logo" }))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .at(0) ?? null)
        : null,
    [repository],
  );
  return (
    <span className="flex items-center gap-2">
      {logo ? (
        <Image
          src={`data:${logo.mimeType};base64,${logo.data}`}
          alt="HEXAGONE MMA"
          width={24}
          height={24}
          unoptimized
          className="size-6 object-contain"
        />
      ) : (
        <Placeholder />
      )}
      <span className="hidden font-mono text-xs tracking-[0.2em] text-foreground sm:inline">
        SOCIAL STUDIO
      </span>
    </span>
  );
}
