"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useRepository } from "@/hooks/useRepository";
import type { StudioData } from "@/hooks/useStudioData";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";
import { truncateInstagram } from "@/lib/platforms/truncation";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import type { Generation } from "@/types/domain";
import { FacebookPreview } from "./FacebookPreview";
import { InstagramPreview } from "./InstagramPreview";
import { PhoneFrame } from "./PhoneFrame";
import { TikTokPreview } from "./TikTokPreview";
import { XPreview } from "./XPreview";

export const SIMULATION_NOTICE =
  "Simulation éditoriale : le rendu réel varie selon l'appareil et l'application.";

/** Colonne 3 : aperçu par plateforme (section 13.5). */
export function PreviewColumn({ data }: { data: StudioData }) {
  const repository = useRepository();
  const mode = useStudioStore((s) => s.mode);
  const generationId = useStudioStore((s) => s.generationIds[s.mode]);
  const draftPlatform = useStudioStore((s) => s.drafts[s.mode].platform);
  const chosen = useStudioStore((s) => s.previewPlatforms[s.mode]);
  const generation = useLiveQuery<Generation | null>(
    async () =>
      repository && generationId
        ? ((await repository.generations.get(generationId)) ?? null)
        : null,
    [repository, generationId],
  );
  const current = generation?.brief.mode === mode ? generation : null;
  const variant = current?.variants.find((v) => v.selected) ?? current?.variants[0];
  const live = useStudioSession((s) => (variant ? s.liveText[variant.id] : undefined));
  const platform = chosen ?? current?.brief.platform ?? draftPlatform;

  const [visibleOnly, setVisibleOnly] = useState(false);
  const [video, setVideo] = useState(false);
  const [wide, setWide] = useState(false);
  const [limit, setLimit] = useState(data.settings.igTruncation);
  const commit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [syncedLimit, setSyncedLimit] = useState(data.settings.igTruncation);
  if (data.settings.igTruncation !== syncedLimit) {
    setSyncedLimit(data.settings.igTruncation);
    setLimit(data.settings.igTruncation);
  }
  useEffect(() => () => clearTimeout(commit.current), []);

  const changeLimit = (value: number) => {
    setLimit(value);
    clearTimeout(commit.current);
    commit.current = setTimeout(() => {
      if (repository) void repository.saveSettings({ ...data.settings, igTruncation: value });
    }, 200);
  };

  const declined =
    current && platform !== current.brief.platform ? current.declinations?.[platform] : undefined;
  const text = declined ?? live ?? variant?.revisions.at(-1)?.text ?? "";
  const account = data.settings.accountName;
  const cut = truncateInstagram(text, limit);

  const backToEdit = () => {
    if (!variant) return;
    useStudioStore.getState().setMobileTab("results");
    requestAnimationFrame(() => document.getElementById(`editor-${variant.id}`)?.focus());
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <Segmented
        label="Plateforme de l'aperçu"
        value={platform}
        options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_RULES[p].label }))}
        onChange={(p) => useStudioStore.getState().setPreviewPlatform(p)}
      />
      <p className="rounded-md border border-border bg-elevated px-3 py-2 text-xs text-muted-foreground">
        {SIMULATION_NOTICE}
      </p>
      {declined ? (
        <p className="text-xs text-muted-foreground">
          Version déclinée pour {PLATFORM_RULES[platform].label}.
        </p>
      ) : null}

      {!variant ? (
        <p className="py-10 text-center text-13 text-muted-foreground">
          L&apos;aperçu apparaîtra après la génération.
        </p>
      ) : (
        <PhoneFrame>
          {platform === "instagram" ? (
            <InstagramPreview
              text={text}
              accountName={account}
              limit={limit}
              visibleOnly={visibleOnly}
              video={video}
            />
          ) : platform === "facebook" ? (
            <FacebookPreview
              text={text}
              accountName={account}
              limit={data.settings.fbTruncation}
              wide={wide}
            />
          ) : platform === "x" ? (
            <XPreview text={text} accountName={account} />
          ) : (
            <TikTokPreview text={text} accountName={account} />
          )}
        </PhoneFrame>
      )}

      {variant && platform === "instagram" ? (
        <div className="flex flex-col gap-2 text-xs">
          <p className="text-muted-foreground" data-testid="ig-indicator">
            Accroche visible : {cut.visibleCount} / {limit} caractères
          </p>
          {cut.hookCut ? (
            <p className="text-warning" role="status">
              L&apos;accroche est coupée avant « plus ».
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-muted-foreground">
            Coupure « … plus » : {limit} caractères
            <input
              type="range"
              min={60}
              max={300}
              value={limit}
              onChange={(e) => changeLimit(Number(e.target.value))}
              className="accent-[var(--accent)]"
            />
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              role="switch"
              checked={visibleOnly}
              onChange={(e) => setVisibleOnly(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Afficher uniquement la partie visible avant PLUS
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={video}
              onChange={(e) => setVideo(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Vidéo (Reel)
          </label>
        </div>
      ) : null}
      {variant && platform === "facebook" ? (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={wide}
            onChange={(e) => setWide(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Média 16:9
        </label>
      ) : null}

      {variant ? (
        <Button variant="secondary" className="self-start" onClick={backToEdit}>
          <PenLine aria-hidden="true" />
          Retour à la modification
        </Button>
      ) : null}
    </div>
  );
}
