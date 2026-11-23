"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const ROWS: [string, string, string][] = [
  ["Ctrl / Cmd + Entrée", "Générer", "Oui"],
  ["Ctrl / Cmd + Maj + C", "Copier la variante affichée (ou le texte sélectionné)", "Oui"],
  ["Alt + 1 / 2 / 3", "Afficher la variante 1, 2 ou 3 dans l'aperçu", "Oui"],
  ["1 à 9, 0, -, =", "Catégorie LIVE SHOW", "Non"],
  ["Alt + L / Alt + D", "Changer de mode", "Oui"],
  ["Ctrl / Cmd + K", "Recherche globale", "Oui"],
  ["Échap", "Fermer une fenêtre, un panneau, la palette", "Oui"],
  ["?", "Afficher cette aide", "Non"],
];

/** Aide « ? » : la liste des raccourcis du Studio (section 13.6). */
export function ShortcutsDialog({
  open,
  copyShortcut,
  onOpenChange,
}: {
  open: boolean;
  copyShortcut: "mod+shift+c" | "mod+alt+c";
  onOpenChange: (open: boolean) => void;
}) {
  const rows = ROWS.map((row): [string, string, string] =>
    row[1].startsWith("Copier") && copyShortcut === "mod+alt+c"
      ? ["Ctrl / Cmd + Alt + C", row[1], row[2]]
      : row,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Raccourcis clavier</DialogTitle>
        <DialogDescription>
          Sur macOS avec les outils de développement ouverts, Cmd + Maj + C ouvre l&apos;inspecteur
          de Chrome : l&apos;alternative Cmd + Alt + C se règle dans Préférences.
        </DialogDescription>
        <table className="w-full text-13">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Raccourci</th>
              <th className="pb-2 font-medium">Action</th>
              <th className="pb-2 font-medium">Dans un champ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([keys, action, inField]) => (
              <tr key={keys} className="border-t border-border">
                <td className="py-1.5 pr-3">
                  <Kbd>{keys}</Kbd>
                </td>
                <td className="py-1.5 pr-3">{action}</td>
                <td className="py-1.5 text-muted-foreground">{inField}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
