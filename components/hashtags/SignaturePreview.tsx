import { previewSignature } from "@/lib/hashtags/signatures";
import type { HexEvent, Signature } from "@/types/domain";

/** Rendu de la signature avec l'événement choisi pour l'aperçu. */
export function SignaturePreview({
  values,
  event,
}: {
  values: Pick<Signature, "template" | "requiredFields" | "requiresConfirmedSchedule">;
  event: HexEvent | undefined;
}) {
  if (!event) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucun événement pour l&apos;aperçu : créez-en un dans Événements.
      </p>
    );
  }
  const rendered = previewSignature(values, event);
  if (rendered.text) {
    return (
      <pre
        className="rounded-md border border-border bg-background p-2 font-sans text-13 whitespace-pre-wrap"
        data-testid="signature-preview"
      >
        {rendered.text}
      </pre>
    );
  }
  return (
    <p className="text-xs text-warning" data-testid="signature-preview">
      {rendered.needsConfirmedSchedule
        ? "Non ajoutée : les horaires de cet événement ne sont pas confirmés."
        : rendered.missing.length > 0
          ? `Signature incomplète : ${rendered.missing.join(", ")} ${rendered.missing.length > 1 ? "manquants" : "manquant"}.`
          : "Rien à afficher pour cet événement."}
    </p>
  );
}
