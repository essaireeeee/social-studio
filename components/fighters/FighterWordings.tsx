import { Badge } from "@/components/ui/badge";
import { getCategory } from "@/lib/categories/registry";
import { formatDate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/library/labels";
import type { Wording } from "@/types/domain";

/** Onglet « Publications associées » : wordings de la bibliothèque liés à la fiche. */
export function FighterWordings({ wordings }: { wordings: readonly Wording[] }) {
  if (wordings.length === 0) {
    return (
      <p className="text-13 text-muted-foreground">
        Aucune publication de la bibliothèque n&apos;est reliée à ce combattant.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {wordings.map((w) => (
        <li key={w.id} className="rounded-md border border-border p-3">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{getCategory(w.categoryId)?.label}</span>
            <span>· {formatDate(w.date ?? w.createdAt)}</span>
            <Badge variant={w.status === "published" ? "success" : "neutral"}>
              {STATUS_LABELS[w.status]}
            </Badge>
            {w.isDemo ? <Badge variant="warning">EXEMPLE FICTIF</Badge> : null}
          </p>
          <p className="mt-1 line-clamp-3 text-13 whitespace-pre-line">{w.text}</p>
        </li>
      ))}
    </ul>
  );
}
