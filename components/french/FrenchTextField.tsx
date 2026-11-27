"use client";

import type { ComponentProps } from "react";
import { useFrenchEditor } from "@/hooks/useFrenchEditor";
import type { FrenchAuthor } from "@/lib/french/journal";
import type { Mode } from "@/types/domain";
import { FrenchAwareTextarea } from "./FrenchAwareTextarea";
import { FrenchBadge } from "./FrenchBadge";
import { RuleSheet } from "./RuleSheet";

type TextareaProps = Omit<
  ComponentProps<typeof FrenchAwareTextarea>,
  "issues" | "actions" | "onExplain" | "value" | "onValueChange"
>;

/**
 * Champ de saisie avec l'Atelier Français complet : badge de qualité, « Tout corriger »,
 * soulignés et fiches d'alerte. Pour tous les champs où l'on écrit un texte publié.
 */
export function FrenchTextField({
  value,
  onValueChange,
  author = "cm",
  categoryId,
  mode,
  ...props
}: TextareaProps & {
  value: string;
  onValueChange: (value: string) => void;
  author?: FrenchAuthor;
  categoryId?: string;
  mode?: Mode;
}) {
  const french = useFrenchEditor({ text: value, onText: onValueChange, author, categoryId, mode });
  return (
    <div className="flex flex-col gap-2">
      {french.ready && value.trim() ? (
        <FrenchBadge
          issues={french.issues}
          actions={french.actions}
          remote={french.remote}
          onExplain={french.setExplain}
        />
      ) : null}
      <FrenchAwareTextarea
        {...props}
        value={value}
        onValueChange={onValueChange}
        issues={french.issues}
        actions={french.actions}
        onExplain={french.setExplain}
      />
      <RuleSheet ruleId={french.explain} onClose={() => french.setExplain(null)} />
    </div>
  );
}
