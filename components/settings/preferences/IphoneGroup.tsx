import { Share, SquarePlus } from "lucide-react";
import { FormGroup } from "@/components/ui/form-group";

/**
 * Installation et usage sur iPhone (sections 3.4 et 5.7 de PROMPT_V2.md) : ce qui marche,
 * ce qui ne marche pas, sans promesse.
 */
export function IphoneGroup() {
  return (
    <>
      <FormGroup
        title="Installer sur l'écran d'accueil"
        footer="L'installation et les notifications exigent une adresse en HTTPS (sauf localhost)."
      >
        <ol className="flex flex-col gap-3 text-subheadline">
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold">
              1
            </span>
            <span>
              Dans Safari, ouvrez l&apos;application puis touchez <strong>Partager</strong>{" "}
              <Share
                className="inline size-4 align-text-bottom text-accent-text"
                aria-label="(icône Partager)"
              />
              .
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold">
              2
            </span>
            <span>
              Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>{" "}
              <SquarePlus
                className="inline size-4 align-text-bottom text-accent-text"
                aria-label="(icône Ajouter)"
              />
              , puis
              <strong> Ajouter</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold">
              3
            </span>
            <span>
              L&apos;application s&apos;ouvre alors en plein écran, sans la barre de Safari.
            </span>
          </li>
        </ol>
      </FormGroup>
      <FormGroup title="Utiliser l'app sur iPhone">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-subheadline">
          <li>
            <strong>localhost</strong> sur l&apos;ordinateur n&apos;est pas accessible depuis le
            téléphone.
          </li>
          <li>
            Les données sont <strong>propres à chaque appareil et à chaque navigateur</strong>. Sans
            synchronisation, le téléphone et l&apos;ordinateur n&apos;ont pas les mêmes données :
            l&apos;export et l&apos;import JSON (Gestion des données) permettent un transfert
            manuel.
          </li>
          <li>
            <strong>Pour juger le design</strong> : lancez{" "}
            <code className="rounded bg-fill px-1 font-mono text-footnote">
              next dev --experimental-https -H 0.0.0.0
            </code>{" "}
            puis ouvrez l&apos;adresse IP de l&apos;ordinateur dans Safari, après avoir accepté le
            certificat.
          </li>
          <li>
            <strong>Pour un usage quotidien</strong> : un déploiement privé protégé par une
            authentification, avec synchronisation. Hors périmètre de cette version.
          </li>
        </ul>
      </FormGroup>
    </>
  );
}
