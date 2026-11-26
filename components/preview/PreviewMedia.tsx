"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Clapperboard, ImageIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";
import { useRepository } from "@/hooks/useRepository";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast.store";

const BLOB_ID = "preview-image";
const MAX_BYTES = 5 * 1024 * 1024;

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface PreviewMediaProps {
  /** Rapport largeur / hauteur (4:5 → 0.8). */
  ratio: number;
  video?: boolean;
  className?: string;
}

/** Visuel de l'aperçu : image déposée (en base, incluse dans les sauvegardes) ou fond neutre. */
export function PreviewMedia({ ratio, video = false, className }: PreviewMediaProps) {
  const repository = useRepository();
  const input = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);
  const image = useLiveQuery(
    async () => (repository ? ((await repository.blobs.get(BLOB_ID)) ?? null) : null),
    [repository],
  );

  const store = async (file: File | undefined) => {
    if (!file || !repository) return;
    if (!file.type.startsWith("image/")) return toast("Choisissez une image.", "danger");
    if (file.size > MAX_BYTES) return toast("Image trop lourde (5 Mo au plus).", "danger");
    await repository.blobs.put({
      id: BLOB_ID,
      kind: "preview_image",
      mimeType: file.type,
      data: await readBase64(file),
      size: file.size,
      updatedAt: new Date().toISOString(),
    });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    void store(event.dataTransfer.files[0]);
  };

  return (
    <div
      className={cn(
        "relative w-full bg-[var(--pv-media)]",
        over && "outline-2 outline-[var(--accent)] outline-dashed",
        className,
      )}
      style={{ aspectRatio: String(ratio) }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {image ? (
        <Image
          src={`data:${image.mimeType};base64,${image.data}`}
          alt="Visuel de la publication"
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--pv-media-text)]">
          {video ? (
            <Clapperboard className="size-8" aria-hidden="true" />
          ) : (
            <ImageIcon className="size-8" aria-hidden="true" />
          )}
          <span className="text-xs">Déposez une image</span>
        </div>
      )}
      {video && image ? (
        <Clapperboard
          className="absolute top-3 right-3 size-5 text-white drop-shadow"
          aria-label="Reel"
        />
      ) : null}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="absolute bottom-2 left-2 cursor-pointer rounded-md bg-black/60 px-2 py-1 text-[11px] text-white hover:bg-black/80"
      >
        Changer l&apos;image
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Image de l'aperçu"
        onChange={(e) => void store(e.target.files?.[0])}
      />
    </div>
  );
}
