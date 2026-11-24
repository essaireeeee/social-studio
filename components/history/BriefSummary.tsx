import { getCategory, getField } from "@/lib/categories/registry";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import { MODE_LABELS } from "@/lib/shell/mode";
import type { Brief, HashtagGroup, Signature } from "@/types/domain";

const labelOf = (key: string) => {
  try {
    return getField(key).label;
  } catch {
    return key;
  }
};

const display = (value: unknown) =>
  Array.isArray(value) ? value.join(", ") : value === true ? "Oui" : String(value);

/** Brief initial d'une génération, tel qu'envoyé au moteur. */
export function BriefSummary({
  brief,
  groups,
  signatures,
}: {
  brief: Brief;
  groups: readonly HashtagGroup[];
  signatures: readonly Signature[];
}) {
  const rows: [string, string][] = [
    ["Mode", MODE_LABELS[brief.mode]],
    ["Catégorie", getCategory(brief.categoryId)?.label ?? brief.categoryId],
    ["Plateforme", PLATFORM_RULES[brief.platform].label],
    ...Object.entries(brief.fields).map(([key, value]): [string, string] => [
      labelOf(key),
      display(value),
    ]),
  ];
  const hashtags = brief.hashtagIds
    .map((id) => groups.find((g) => g.id === id)?.name)
    .filter(Boolean);
  if (hashtags.length > 0) rows.push(["Hashtags", hashtags.join(", ")]);
  const signature = signatures.find((s) => s.id === brief.signatureId);
  if (signature) rows.push(["Signature", signature.name]);
  if (brief.cta) rows.push(["Appel à l'action", brief.cta]);
  if (brief.freeInstruction) rows.push(["Consigne", brief.freeInstruction]);
  return (
    <dl className="grid gap-x-3 gap-y-1 text-13 sm:grid-cols-[10rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
