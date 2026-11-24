import { TABLE_LABELS } from "@/lib/data/import-json";
import type { SnapshotCounts } from "@/lib/database/snapshot";

/** Volumes par table d'un instantané (aperçu avant import ou restauration). */
export function CountsTable({ counts, caption }: { counts: SnapshotCounts; caption: string }) {
  return (
    <table className="w-full max-w-md text-13">
      <caption className="mb-1 text-left text-xs text-muted-foreground">{caption}</caption>
      <tbody>
        {(Object.keys(TABLE_LABELS) as (keyof SnapshotCounts)[]).map((name) => (
          <tr key={name} className="border-t border-border">
            <th scope="row" className="py-1 text-left font-normal text-muted-foreground">
              {TABLE_LABELS[name]}
            </th>
            <td className="py-1 text-right tabular-nums">{counts[name]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
