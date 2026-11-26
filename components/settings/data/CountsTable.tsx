import { TABLE_LABELS } from "@/lib/data/import-json";
import { V2_TABLE_NAMES, type SnapshotCounts } from "@/lib/database/snapshot";

const V2_TABLES = new Set<string>(V2_TABLE_NAMES);

/**
 * Volumes par table d'un instantané (aperçu avant import ou restauration).
 * Les tables V2 vides sont masquées : un export V1 n'en contient aucune.
 */
export function CountsTable({ counts, caption }: { counts: SnapshotCounts; caption: string }) {
  const names = (Object.keys(TABLE_LABELS) as (keyof SnapshotCounts)[]).filter(
    (name) => !V2_TABLES.has(name) || (counts[name] ?? 0) > 0,
  );
  return (
    <table className="w-full max-w-md text-13">
      <caption className="mb-1 text-left text-xs text-muted-foreground">{caption}</caption>
      <tbody>
        {names.map((name) => (
          <tr key={name} className="border-t border-border">
            <th scope="row" className="py-1 text-left font-normal text-muted-foreground">
              {TABLE_LABELS[name]}
            </th>
            <td className="py-1 text-right tabular-nums">{counts[name] ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
