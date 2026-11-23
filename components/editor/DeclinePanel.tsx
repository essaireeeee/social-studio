"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRepository } from "@/hooks/useRepository";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import { saveDeclination } from "@/lib/studio/actions";
import type { Generation, Platform } from "@/types/domain";
import { CharCounter } from "./CharCounter";
import { copyText } from "./VariantActions";

interface DeclinePanelProps {
  generation: Generation;
  /** Passages à vérifier par plateforme (dernière déclinaison de cette session). */
  warnings?: Partial<Record<Platform, number>>;
}

/** Versions par plateforme (section 13.4) : éditables, copiables, enregistrées avec la génération. */
export function DeclinePanel({ generation, warnings }: DeclinePanelProps) {
  const repository = useRepository();
  const declinations = generation.declinations ?? {};
  const platforms = (Object.keys(declinations) as Platform[]).filter((p) => declinations[p]);
  const [drafts, setDrafts] = useState<Partial<Record<Platform, string>>>({});
  if (platforms.length === 0) return null;

  const save = async (platform: Platform) => {
    const text = drafts[platform];
    if (repository && text !== undefined)
      await saveDeclination(repository, generation.id, platform, text);
  };

  return (
    <section aria-label="Déclinaisons" className="rounded-lg border border-border bg-card p-3">
      <Tabs defaultValue={platforms[0]}>
        <TabsList aria-label="Plateformes">
          {platforms.map((p) => (
            <TabsTrigger key={p} value={p}>
              {PLATFORM_RULES[p].label}
              {warnings?.[p] ? <span className="text-warning"> · {warnings[p]}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {platforms.map((p) => {
          const text = drafts[p] ?? declinations[p] ?? "";
          return (
            <TabsContent key={p} value={p} className="flex flex-col gap-2 pt-3">
              <Textarea
                aria-label={`Version ${PLATFORM_RULES[p].label}`}
                autoResize
                rows={4}
                value={text}
                onChange={(e) => setDrafts((d) => ({ ...d, [p]: e.target.value }))}
                onBlur={() => void save(p)}
                className="text-sm leading-[1.6]"
              />
              {warnings?.[p] ? (
                <p className="text-xs text-warning">
                  {warnings[p]} information(s) absente(s) du brief : à vérifier.
                </p>
              ) : null}
              <div className="flex items-center justify-between">
                <CharCounter text={text} platform={p} />
                <Button size="sm" variant="secondary" onClick={() => void copyText(text)}>
                  <Copy aria-hidden="true" />
                  Copier
                </Button>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
