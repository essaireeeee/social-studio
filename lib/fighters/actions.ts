/** Écritures des fiches combattants. La confirmation de suppression est à la charge de l'interface. */
import { newId } from "@/lib/database/hash";
import type { DataRepository } from "@/lib/database/repository";
import type { Fighter } from "@/types/domain";
import { fighterFromForm, type FighterFormValues } from "./form";

export async function saveFighter(
  repository: DataRepository,
  values: FighterFormValues,
  options: { existing?: Fighter; now?: Date } = {},
): Promise<Fighter> {
  return repository.fighters.put(
    fighterFromForm(values, {
      id: options.existing?.id ?? newId(),
      now: options.now ?? new Date(),
    }),
  );
}

export class FighterInUseError extends Error {}

/**
 * Supprime une fiche. Refusé si le combattant figure sur une fight card (le retirer
 * d'abord). Les publications qui le citaient perdent le lien, pas leur texte.
 */
export async function deleteFighter(repository: DataRepository, fighter: Fighter): Promise<void> {
  const events = await repository.events.list();
  const card = events.find((e) =>
    e.fightCard.some((f) => f.fighterAId === fighter.id || f.fighterBId === fighter.id),
  );
  if (card) {
    throw new FighterInUseError(
      `Ce combattant figure sur la fight card de ${card.name}${card.number ? ` ${card.number}` : ""}. Retirez-le d'abord.`,
    );
  }
  const linked = await repository.wordings.list({
    filter: (w) => w.fighterIds.includes(fighter.id),
  });
  await repository.wordings.bulkPut(
    linked.map((w) => ({ ...w, fighterIds: w.fighterIds.filter((id) => id !== fighter.id) })),
  );
  await repository.fighters.delete(fighter.id);
}
