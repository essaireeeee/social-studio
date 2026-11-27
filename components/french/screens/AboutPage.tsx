import { LargeTitle } from "@/components/layout/ScreenTitle";
import { FormGroup } from "@/components/ui/form-group";

/**
 * À propos du correcteur (section 1.1) : seule mention autorisée du Projet Voltaire,
 * en texte simple, sans lien ni logo.
 */
export function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
      <LargeTitle>À propos du correcteur</LargeTitle>
      <FormGroup title="Trois couches">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-subheadline">
          <li>
            <strong>Règles locales</strong> : toujours actives, hors ligne. Plus de 150 règles
            rédigées pour l&apos;application, avec des exemples tirés du MMA.
          </li>
          <li>
            <strong>LanguageTool</strong> (facultatif) : un correcteur libre que vous hébergez
            vous-même. S&apos;il ne répond pas, il est ignoré sans bloquer.
          </li>
          <li>
            <strong>Relecture IA</strong> (facultative) : corrige uniquement les fautes, sans
            reformuler. Toute correction qui change plus de trois mots de suite est rejetée.
          </li>
        </ol>
      </FormGroup>
      <FormGroup title="Ce qui n'est jamais analysé">
        <p className="text-subheadline">
          Hashtags, mentions, liens, emojis, citations d&apos;une réaction de combattant, noms des
          fiches et mots du dictionnaire maison.
        </p>
      </FormGroup>
      <FormGroup title="Référentiel">
        <p className="text-subheadline" data-testid="voltaire-mention">
          Règles organisées par grandes familles, sur le modèle des référentiels d&apos;orthographe
          professionnelle (type Projet Voltaire). Aucun lien ni partenariat avec le Projet Voltaire.
        </p>
      </FormGroup>
    </div>
  );
}
