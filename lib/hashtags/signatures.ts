/**
 * Éditeur de signatures (section 15.3) : variables, champs requis, modes, activation et
 * aperçu rendu avec un événement. Le rendu lui-même vient de `lib/generation/signature.ts`
 * (une ligne dont une variable est vide est supprimée). Logique pure.
 */
import {
  SIGNATURE_VARIABLES,
  renderSignature,
  signatureValues,
  type RenderedSignature,
  type SignatureVariable,
} from "@/lib/generation/signature";
import { SignatureSchema, type HexEvent, type Mode, type Signature } from "@/types/domain";

/** Libellés des variables dans l'éditeur. */
export const VARIABLE_LABELS: Record<SignatureVariable, string> = {
  date: "Date",
  venue: "Salle",
  city: "Ville",
  broadcaster: "Diffuseur",
  prelimsTime: "Horaire préliminaires",
  prelimsChannel: "Chaîne préliminaires",
  mainTime: "Horaire carte principale",
  mainChannel: "Chaîne carte principale",
  ticketLink: "Lien billetterie",
};

/** Variables qui n'ont de valeur que si les horaires de l'événement sont confirmés. */
export const SCHEDULE_VARIABLES: readonly SignatureVariable[] = [
  "prelimsTime",
  "prelimsChannel",
  "mainTime",
  "mainChannel",
];

export interface SignatureFormValues {
  name: string;
  template: string;
  requiredFields: SignatureVariable[];
  requiresConfirmedSchedule: boolean;
  modes: Mode[];
  enabled: boolean;
}

const isVariable = (name: string): name is SignatureVariable =>
  (SIGNATURE_VARIABLES as readonly string[]).includes(name);

export const signatureForm = (signature?: Signature): SignatureFormValues => ({
  name: signature?.name ?? "",
  template: signature?.template ?? "",
  requiredFields: (signature?.requiredFields ?? []).filter(isVariable),
  requiresConfirmedSchedule: signature?.requiresConfirmedSchedule ?? false,
  modes: signature?.modes ?? ["live", "daily"],
  enabled: signature?.enabled ?? true,
});

/** Noms entre accolades trouvés dans le modèle, dans l'ordre, sans doublon. */
export function templateVariables(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))];
}

export function signatureFormErrors(values: SignatureFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = "Le nom est requis.";
  if (!values.template.trim()) errors.template = "Le modèle est vide.";
  const unknown = templateVariables(values.template).filter((name) => !isVariable(name));
  if (unknown.length > 0) {
    errors.template = `Variable inconnue : ${unknown.map((n) => `{${n}}`).join(", ")}.`;
  }
  if (values.modes.length === 0) errors.modes = "Choisissez au moins un mode.";
  return errors;
}

export function signatureFromForm(
  values: SignatureFormValues,
  options: { id: string; order: number },
): Signature {
  return SignatureSchema.parse({
    id: options.id,
    name: values.name.trim(),
    template: values.template.replace(/\s+$/u, ""),
    requiredFields: values.requiredFields,
    requiresConfirmedSchedule: values.requiresConfirmedSchedule,
    modes: values.modes,
    enabled: values.enabled,
    order: options.order,
  });
}

/** Aperçu avec un événement (celui de la Session Live ou le prochain) ; rien sans événement. */
export function previewSignature(
  values: Pick<Signature, "template" | "requiredFields" | "requiresConfirmedSchedule">,
  event: HexEvent | undefined,
): RenderedSignature {
  return renderSignature(values, signatureValues({ event }), event?.confirmedSchedule === true);
}
