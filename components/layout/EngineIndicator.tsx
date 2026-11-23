"use client";

import Link from "next/link";
import { badgeVariants } from "@/components/ui/badge";
import { useAiOverview } from "@/hooks/useAiOverview";
import { cn } from "@/lib/utils";

/** Indicateur du moteur (section 11.5) : « Natif », « Claude · connecté », « OpenAI · erreur ». */
export function EngineIndicator() {
  const { indicator } = useAiOverview();
  return (
    <Link
      href="/settings/ai"
      className={cn(badgeVariants({ variant: indicator.tone }), "h-7 px-2 hover:bg-subtle")}
      aria-label={`Moteur : ${indicator.text}. Ouvrir les paramètres de l'intelligence artificielle`}
    >
      {indicator.text}
    </Link>
  );
}
