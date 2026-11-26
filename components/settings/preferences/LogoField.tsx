"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { logoError } from "@/lib/settings/preferences";
import { toast } from "@/stores/toast.store";

const LOGO_ID = "logo";

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Logo affiché dans le header (stocké en base, donc inclus dans les sauvegardes). */
export function LogoField() {
  const repository = useRepository();
  const [error, setError] = useState<string>();
  const logo = useLiveQuery(
    async () => (repository ? ((await repository.blobs.get(LOGO_ID)) ?? null) : undefined),
    [repository],
  );

  const upload = async (file: File) => {
    if (!repository) return;
    const problem = logoError(file);
    setError(problem);
    if (problem) return;
    await repository.blobs.put({
      id: LOGO_ID,
      kind: "logo",
      mimeType: file.type,
      data: toBase64(await file.arrayBuffer()),
      size: file.size,
      updatedAt: new Date().toISOString(),
    });
    toast("Logo enregistré", "success");
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">Logo</span>
      <div className="flex flex-wrap items-center gap-3">
        {logo ? (
          <Image
            src={`data:${logo.mimeType};base64,${logo.data}`}
            alt="Logo actuel"
            width={40}
            height={40}
            unoptimized
            className="size-10 rounded-sm bg-elevated object-contain p-1"
          />
        ) : (
          <span className="text-13 text-muted-foreground">
            Aucun logo : l&apos;hexagone par défaut s&apos;affiche.
          </span>
        )}
        <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-elevated px-3 text-13 hover:bg-fill">
          Choisir une image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {logo ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => repository && void repository.blobs.delete(LOGO_ID)}
          >
            <Trash2 aria-hidden="true" />
            Retirer
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">PNG, JPEG, WebP ou SVG, 512 Ko au maximum.</p>
    </div>
  );
}
