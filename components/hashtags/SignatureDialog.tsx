"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRepository } from "@/hooks/useRepository";
import { SIGNATURE_VARIABLES } from "@/lib/generation/signature";
import { saveSignature } from "@/lib/hashtags/actions";
import { VARIABLE_LABELS, signatureForm, signatureFormErrors } from "@/lib/hashtags/signatures";
import { toast } from "@/stores/toast.store";
import type { HexEvent, Signature } from "@/types/domain";
import { ModeChecks } from "./ModeChecks";
import { SignaturePreview } from "./SignaturePreview";

interface SignatureDialogProps {
  signature?: Signature;
  previewEvent?: HexEvent;
  onClose: () => void;
}

/** Éditeur de signature : variables, champs requis, modes, activation, aperçu (section 15.3). */
export function SignatureDialog({ signature, previewEvent, onClose }: SignatureDialogProps) {
  const repository = useRepository();
  const [values, setValues] = useState(() => signatureForm(signature));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);

  const insert = (name: string) => {
    const el = area.current;
    const token = `{${name}}`;
    const start = el?.selectionStart ?? values.template.length;
    const end = el?.selectionEnd ?? start;
    const template = values.template.slice(0, start) + token + values.template.slice(end);
    setValues((v) => ({ ...v, template }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = async () => {
    if (!repository) return;
    const found = signatureFormErrors(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await saveSignature(repository, values, signature);
    toast(signature ? "Signature modifiée" : "Signature créée", "success");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{signature ? "Modifier la signature" : "Nouvelle signature"}</DialogTitle>
        <DialogDescription>
          Une ligne dont une variable est vide n&apos;apparaît pas. Les horaires ne sont remplis que
          si l&apos;événement a des horaires confirmés.
        </DialogDescription>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField id="signature-name" label="Nom" error={errors.name}>
            <Input
              id="signature-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </FormField>
          <FormField id="signature-template" label="Modèle" error={errors.template}>
            <Textarea
              id="signature-template"
              ref={area}
              rows={5}
              value={values.template}
              onChange={(e) => setValues((v) => ({ ...v, template: e.target.value }))}
              className="font-mono text-xs"
            />
          </FormField>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Insérer une variable">
            {SIGNATURE_VARIABLES.map((name) => (
              <Button
                key={name}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => insert(name)}
              >
                {`{${name}}`}
              </Button>
            ))}
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs text-muted-foreground">
              Champs requis (sans eux, la signature n&apos;est pas ajoutée)
            </legend>
            <div className="grid gap-1 sm:grid-cols-3">
              {SIGNATURE_VARIABLES.map((name) => (
                <label key={name} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={values.requiredFields.includes(name)}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        requiredFields: e.target.checked
                          ? [...v.requiredFields, name]
                          : v.requiredFields.filter((f) => f !== name),
                      }))
                    }
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  {VARIABLE_LABELS[name]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-13">
            <input
              type="checkbox"
              checked={values.requiresConfirmedSchedule}
              onChange={(e) =>
                setValues((v) => ({ ...v, requiresConfirmedSchedule: e.target.checked }))
              }
              className="size-4 accent-[var(--accent)]"
            />
            Uniquement si les horaires sont confirmés
          </label>
          <ModeChecks
            value={values.modes}
            error={errors.modes}
            onChange={(modes) => setValues((v) => ({ ...v, modes }))}
          />
          <label className="flex items-center gap-2 text-13">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => setValues((v) => ({ ...v, enabled: e.target.checked }))}
              className="size-4 accent-[var(--accent)]"
            />
            Active (proposée dans le Studio)
          </label>
          <section aria-label="Aperçu" className="flex flex-col gap-1">
            <h3 className="text-xs text-muted-foreground">Aperçu</h3>
            <SignaturePreview values={values} event={previewEvent} />
          </section>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
