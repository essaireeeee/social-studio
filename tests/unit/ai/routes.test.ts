import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as declinePost } from "@/app/api/decline/route";
import { POST as generatePost } from "@/app/api/generate/route";
import { POST as refinePost } from "@/app/api/refine/route";
import { GET as statusGet } from "@/app/api/ai/status/route";
import { POST as testPost } from "@/app/api/ai/test/route";
import { KEY_HEADER, MODEL_HEADER } from "@/lib/ai/keys";
import {
  SESSION_KEY,
  anthropicMessage,
  generateBody,
  json,
  mockFetch,
  openaiResponse,
  refineBody,
  routeRequest,
  variantsJson,
} from "../../fixtures/ai";

vi.mock("next/server", () => ({ connection: async () => {} }));

const withKey = { [KEY_HEADER]: SESSION_KEY };

function clearProviderEnv() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("ANTHROPIC_MODEL", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL", "");
  vi.stubEnv("ALLOW_CLIENT_KEYS", "");
  vi.stubEnv("AI_TIMEOUT_MS", "");
  vi.stubEnv("AI_PROVIDER", "");
}

beforeEach(clearProviderEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/generate", () => {
  it("sans clé : fallback avec motif, aucun appel réseau", async () => {
    const { fetchMock } = mockFetch(json({}));
    const response = await generatePost(routeRequest("/api/generate", generateBody()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      fallback: true,
      reason: "aucune clé Claude (Anthropic) configurée",
      code: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("corps invalide : 400 et fallback", async () => {
    const response = await generatePost(routeRequest("/api/generate", { provider: "anthropic" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ fallback: true, code: "invalid_request" });
  });

  it("clé de session : vrai appel du SDK, sortie structurée, post-traitement", async () => {
    const { calls } = mockFetch(json(anthropicMessage(variantsJson())));
    const response = await generatePost(routeRequest("/api/generate", generateBody(), withKey));
    const body = await response.json();
    expect(body.fallback).toBe(false);
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.variants.map((v: { kind: string }) => v.kind)).toEqual([
      "punchy",
      "signature",
      "storytelling",
    ]);
    for (const variant of body.variants) expect(variant.factWarnings).toEqual([]);
    // Atelier Français puis linter : espace fine (U+202F) ou insécable (U+00A0) avant « ! ».
    expect(body.variants[0].text).toMatch(new RegExp("Fictif[\\u00A0\\u202F]!"));

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toMatch(/\/v1\/messages$/);
    // SDK 1.x : la clé part dans l'en-tête Authorization.
    expect(calls[0]!.headers.get("authorization")).toBe(`Bearer ${SESSION_KEY}`);
    const sent = calls[0]!.body as {
      model: string;
      system: string;
      output_config: { format: { type: string } };
    };
    expect(sent.model).toBe("claude-sonnet-5-5");
    expect(sent.output_config.format.type).toBe("json_schema");
    expect(sent.system).toContain("Écris « de HEXAGONE MMA », jamais « d'HEXAGONE MMA »");
  });

  it("une date absente des faits produit un FactWarning", async () => {
    const invented =
      "⚡ Une fin nette.\n\nKarim Fictif remet ça samedi face à Tom Essai.\n\n#HexagoneMMA";
    mockFetch(json(anthropicMessage(variantsJson(invented))));
    const body = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    const storytelling = body.variants.find((v: { kind: string }) => v.kind === "storytelling");
    expect(storytelling.factWarnings).toEqual([
      expect.objectContaining({ kind: "date", value: "samedi" }),
    ]);
    const { start, end } = storytelling.factWarnings[0];
    expect(storytelling.text.slice(start, end)).toBe("samedi");
  });

  it("retire les hashtags non cochés par le CM", async () => {
    mockFetch(
      json(
        anthropicMessage(
          variantsJson("⚡ Une fin nette.\n\nKarim Fictif s'impose.\n\n#HexagoneMMA #UFC #MMA"),
        ),
      ),
    );
    const body = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(body.variants[2].text).toMatch(/#HexagoneMMA$/);
    expect(body.variants[2].text).not.toContain("#UFC");
  });

  it("JSON invalide : une nouvelle tentative, puis bascule", async () => {
    const ok = mockFetch(
      json(anthropicMessage("Voici : pas du JSON")),
      json(anthropicMessage(variantsJson())),
    );
    const first = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(first.fallback).toBe(false);
    expect(ok.calls).toHaveLength(2);

    const bad = mockFetch(json(anthropicMessage("{ toujours pas")));
    const second = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(second).toEqual({
      fallback: true,
      reason: "réponse illisible (JSON invalide)",
      code: "invalid_output",
    });
    expect(bad.calls).toHaveLength(2);
  });

  it("deux variantes au lieu de trois : sortie refusée", async () => {
    const parsed = JSON.parse(variantsJson());
    parsed.variants.pop();
    mockFetch(json(anthropicMessage(JSON.stringify(parsed))));
    const body = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(body).toMatchObject({ fallback: true, code: "invalid_output" });
  });

  it.each([
    [401, "clé refusée par le fournisseur (401)"],
    [404, "modèle introuvable : claude-sonnet-5-5 (404)"],
    [429, "limite de requêtes atteinte (429)"],
    [529, "fournisseur indisponible (529)"],
  ])("erreur %i : bascule avec motif précis", async (status, reason) => {
    mockFetch(json({ type: "error", error: { type: "x", message: "refus" } }, status));
    const body = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(body).toMatchObject({ fallback: true, reason });
  });

  it("délai AI_TIMEOUT_MS dépassé : bascule", async () => {
    vi.stubEnv("AI_TIMEOUT_MS", "1000");
    mockFetch(
      (signal) =>
        new Promise<Response>((_, reject) =>
          signal?.addEventListener("abort", () => reject(signal.reason)),
        ),
    );
    const body = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(body).toMatchObject({ fallback: true, code: "timeout", reason: "délai dépassé (1 s)" });
  });

  it("en production, la clé d'en-tête est ignorée sauf ALLOW_CLIENT_KEYS=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { fetchMock } = mockFetch(json(anthropicMessage(variantsJson())));
    const refused = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(refused).toMatchObject({ fallback: true, code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv("ALLOW_CLIENT_KEYS", "true");
    const allowed = await (
      await generatePost(routeRequest("/api/generate", generateBody(), withKey))
    ).json();
    expect(allowed.fallback).toBe(false);
  });

  it("la clé du .env est prioritaire sur celle de l'en-tête", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-env-key-0000000000");
    const { calls } = mockFetch(json(anthropicMessage(variantsJson())));
    await generatePost(routeRequest("/api/generate", generateBody(), withKey));
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer sk-ant-env-key-0000000000");
  });
});

describe("aucun log ne contient la clé passée en en-tête", () => {
  it("ni sur une erreur 401 qui la répète, ni dans la réponse", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const echo = { type: "error", error: { type: "auth", message: `invalid key ${SESSION_KEY}` } };
    mockFetch(json(echo, 401));
    const texts: string[] = [];
    for (const [handler, path, body] of [
      [generatePost, "/api/generate", generateBody()],
      [refinePost, "/api/refine", refineBody()],
      [declinePost, "/api/decline", { ...refineBody(), targets: ["x", "facebook"] }],
      [testPost, "/api/ai/test", { provider: "anthropic" }],
    ] as const) {
      const response = await handler(routeRequest(path, body, withKey));
      texts.push(await response.text());
    }
    const logged = spies.flatMap((spy) => spy.mock.calls.map((args) => JSON.stringify(args)));
    expect(logged.length).toBeGreaterThan(0);
    for (const line of [...logged, ...texts]) {
      expect(line).not.toContain(SESSION_KEY);
      expect(line).not.toContain("SECRET");
    }
    // Le test de connexion donne l'erreur exacte, clé masquée.
    expect(JSON.parse(texts[3]!)).toMatchObject({
      ok: false,
      error: "clé refusée par le fournisseur (401) : invalid key [masqué]",
    });
  });
});

describe("POST /api/refine", () => {
  it("new_hook : seule la première ligne peut changer, sinon refus après une nouvelle tentative", async () => {
    const original = refineBody().text;
    const changed = "⚡ Karim Fictif frappe fort !\n\nUn tout autre corps.\n\n#HexagoneMMA";
    const { calls } = mockFetch(json(anthropicMessage(JSON.stringify({ text: changed }))));
    const refused = await (
      await refinePost(routeRequest("/api/refine", refineBody(), withKey))
    ).json();
    expect(refused).toEqual({
      fallback: true,
      reason: "le modèle a modifié autre chose que l'accroche",
      code: "hook_only_violation",
    });
    expect(calls).toHaveLength(2);

    const hookOnly = original.replace("💥 KO de Karim Fictif !", "⚡ Karim Fictif frappe fort !");
    mockFetch(json(anthropicMessage(JSON.stringify({ text: hookOnly }))));
    const accepted = await (
      await refinePost(routeRequest("/api/refine", refineBody(), withKey))
    ).json();
    expect(accepted.fallback).toBe(false);
    expect(accepted.result.text.split("\n")[0]).toContain("Karim Fictif frappe fort");
  });

  it("transmet la consigne « Ne modifie que ce qui est demandé »", async () => {
    const { calls } = mockFetch(
      json(anthropicMessage(JSON.stringify({ text: "💥 KO de Karim Fictif.\n\n#HexagoneMMA" }))),
    );
    await refinePost(routeRequest("/api/refine", refineBody({ action: "shorten" }), withKey));
    const sent = calls[0]!.body as { system: string };
    expect(sent.system).toContain(
      "Ne modifie que ce qui est demandé. Conserve toutes les informations factuelles.",
    );
  });

  it("consigne libre vide : 400", async () => {
    const response = await refinePost(
      routeRequest("/api/refine", refineBody({ action: "custom", instruction: " " }), withKey),
    );
    expect(response.status).toBe(400);
  });
});

describe("OpenAI", () => {
  it("sans OPENAI_MODEL ni modèle saisi : non configuré", async () => {
    const body = await (
      await generatePost(
        routeRequest("/api/generate", generateBody({ provider: "openai" }), withKey),
      )
    ).json();
    expect(body).toEqual({
      fallback: true,
      reason: "aucun modèle OpenAI défini",
      code: "not_configured",
    });
  });

  it("modèle saisi : API Responses, store: false, sortie validée", async () => {
    const { calls } = mockFetch(json(openaiResponse(variantsJson())));
    const body = await (
      await generatePost(
        routeRequest("/api/generate", generateBody({ provider: "openai" }), {
          ...withKey,
          [MODEL_HEADER]: "gpt-test",
        }),
      )
    ).json();
    expect(body).toMatchObject({ fallback: false, provider: "openai", model: "gpt-test" });
    expect(calls[0]!.url).toMatch(/\/v1\/responses$/);
    expect(calls[0]!.headers.get("authorization")).toBe(`Bearer ${SESSION_KEY}`);
    expect(calls[0]!.body).toMatchObject({ model: "gpt-test", store: false });
  });
});

describe("test de connexion et état", () => {
  it("vrai appel au modèle : latence et identifiant", async () => {
    const { calls } = mockFetch(
      json({ type: "model", id: "claude-sonnet-5-5", display_name: "Claude Sonnet 5.5" }),
    );
    const result = await (
      await testPost(routeRequest("/api/ai/test", { provider: "anthropic" }, withKey))
    ).json();
    expect(result).toMatchObject({
      ok: true,
      model: "claude-sonnet-5-5",
      keySource: "session",
      modelSource: "default",
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(calls[0]!.url).toMatch(/\/v1\/models\/claude-sonnet-5-5$/);
  });

  it("sans clé : échec explicite, sans appel", async () => {
    const { fetchMock } = mockFetch(json({}));
    const result = await (
      await testPost(routeRequest("/api/ai/test", { provider: "openai" }))
    ).json();
    expect(result).toMatchObject({ ok: false, error: "aucune clé OpenAI configurée" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("/api/ai/status ne renvoie jamais de clé", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-env-key-0000000000");
    vi.stubEnv("OPENAI_MODEL", "gpt-env");
    const response = await statusGet();
    const text = await response.text();
    expect(text).not.toContain("sk-ant-env-key");
    expect(JSON.parse(text)).toEqual({
      clientKeysAllowed: true,
      defaultEngine: "native",
      providers: [
        {
          id: "anthropic",
          label: "Claude (Anthropic)",
          keyInEnv: true,
          defaultModel: "claude-sonnet-5-5",
        },
        { id: "openai", label: "OpenAI", keyInEnv: false, modelInEnv: "gpt-env" },
      ],
    });
  });
});
