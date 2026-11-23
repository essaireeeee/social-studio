/**
 * Registre des fournisseurs IA (section 11.1). Ajouter un fournisseur : écrire son pilote
 * dans `adapters/`, ajouter une ligne ci-dessous et son identifiant à `EngineSchema`.
 * Code serveur uniquement (les SDK ne doivent jamais entrer dans le bundle client).
 */
import { createAdapter } from "./adapter";
import { anthropicDriver } from "./adapters/anthropic";
import { openaiDriver } from "./adapters/openai";
import type { AIProviderAdapter, ProviderDriver, ProviderId } from "./types";

export const DRIVERS: Readonly<Record<ProviderId, ProviderDriver>> = {
  anthropic: anthropicDriver,
  openai: openaiDriver,
};

const ADAPTERS = Object.fromEntries(
  Object.values(DRIVERS).map((driver) => [driver.id, createAdapter(driver)]),
) as Record<ProviderId, AIProviderAdapter>;

export function getAdapter(id: ProviderId): AIProviderAdapter {
  return ADAPTERS[id];
}

export function getDriver(id: ProviderId): ProviderDriver {
  return DRIVERS[id];
}

export const PROVIDER_IDS = Object.keys(DRIVERS) as ProviderId[];
