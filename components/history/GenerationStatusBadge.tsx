import { CheckCheck, CircleDashed, PenLine, Send } from "lucide-react";
import { GENERATION_STATUS_LABELS, type GenerationStatus } from "@/lib/history/history";
import { cn } from "@/lib/utils";

/** Quatre statuts, quatre styles et quatre icônes : jamais confondus (section 16.1). */
const STYLES: Record<GenerationStatus, string> = {
  draft: "border-dashed border-border text-muted-foreground",
  editing: "border-warning/40 bg-warning/10 text-warning",
  validated: "border-success/40 bg-success/10 text-success",
  published: "border-success bg-success-fill text-black",
};

const ICONS = { draft: CircleDashed, editing: PenLine, validated: CheckCheck, published: Send };

export function GenerationStatusBadge({ status }: { status: GenerationStatus }) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {GENERATION_STATUS_LABELS[status]}
    </span>
  );
}
