// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderPanel } from "@/components/settings/ProviderPanel";
import { providerView } from "@/lib/ai/indicator";
import type { ProviderStatus } from "@/lib/ai/service";
import {
  readSessionCredentials,
  sessionCredentialsSnapshot,
  writeSessionCredentials,
} from "@/lib/generation/ai-client";

const anthropic: ProviderStatus = {
  id: "anthropic",
  label: "Claude (Anthropic)",
  keyInEnv: false,
  defaultModel: "claude-sonnet-5-5",
};

function renderPanel(status: ProviderStatus, credentials = {}, allowed = true) {
  const patches: unknown[] = [];
  render(
    <ProviderPanel
      status={status}
      view={providerView(status, credentials, allowed)}
      clientKeysAllowed={allowed}
      credentials={credentials}
      onCredentials={(patch) => patches.push(patch)}
      onClear={() => {}}
    />,
  );
  return patches;
}

describe("Paramètres > IA : panneau fournisseur", () => {
  it("clé de session : champ masqué, mention, test désactivé sans clé", () => {
    const patches = renderPanel(anthropic);
    const input = screen.getByLabelText("Clé API");
    expect(input).toHaveAttribute("type", "password");
    expect(
      screen.getByText(
        "Conservée uniquement pour cette session de navigateur. Jamais enregistrée.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Non configuré")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tester la connexion" })).toBeDisabled();
    fireEvent.change(input, { target: { value: " sk-ant-xyz-123456 " } });
    expect(patches).toEqual([{ key: "sk-ant-xyz-123456" }]);
  });

  it("clé dans .env : pas de champ, modèle du .env non modifiable", () => {
    renderPanel({ ...anthropic, keyInEnv: true, modelInEnv: "claude-opus-5-5" });
    expect(screen.queryByLabelText("Clé API")).not.toBeInTheDocument();
    expect(screen.getByText("Configuré via .env")).toBeInTheDocument();
    expect(screen.getByText("claude-opus-5-5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tester la connexion" })).toBeEnabled();
  });

  it("production sans ALLOW_CLIENT_KEYS : saisie désactivée", () => {
    renderPanel(anthropic, {}, false);
    expect(screen.queryByLabelText("Clé API")).not.toBeInTheDocument();
    expect(screen.getByText(/Saisie de clé désactivée en production/)).toBeInTheDocument();
  });

  it("la clé vit dans sessionStorage, jamais dans localStorage", () => {
    writeSessionCredentials("anthropic", { key: "sk-ant-session-abcdef" });
    expect(readSessionCredentials("anthropic").key).toBe("sk-ant-session-abcdef");
    expect(sessionCredentialsSnapshot()).toContain("sk-ant-session-abcdef");
    expect(JSON.stringify({ ...localStorage })).not.toContain("sk-ant-session");
    writeSessionCredentials("anthropic", { key: undefined });
    expect(sessionStorage.length).toBe(0);
  });
});
