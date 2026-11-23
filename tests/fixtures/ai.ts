/**
 * Données et doublures réseau pour les tests de la couche IA. Les SDK Anthropic et OpenAI
 * sont utilisés réellement ; seul `fetch` est remplacé, pour ne jamais appeler l'extérieur.
 */
import { vi } from "vitest";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import type { GenerateRequest, RefineRequest } from "@/lib/ai/schema";

export const SESSION_KEY = "sk-ant-test-SECRET-0123456789abcdef";

export const KO_FACTS = [
  "Karim Fictif",
  "Tom Essai",
  "KO",
  "R1",
  "3:12",
  "1er round",
  "#HexagoneMMA",
];

export function generateBody(patch: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    provider: "anthropic",
    brief: {
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      fields: {
        winner: "Karim Fictif",
        loser: "Tom Essai",
        method: "KO",
        round: "R1",
        time: "3:12",
      },
      hashtagIds: ["hashtags-official"],
    },
    platform: "instagram",
    facts: KO_FACTS,
    rules: [...DEFAULT_EDITORIAL_RULES],
    hashtags: ["#HexagoneMMA"],
    broadcasters: ["RMC SPORT", "DAZN"],
    lint: { frenchSpacing: true, recentHooks: [] },
    references: [
      {
        id: "ref-1",
        text: "💥 Quelle fin de combat ! La cage a tremblé ce soir.\n\n#HexagoneMMA",
        categoryId: "live_ko",
        date: "2026-03-14",
      },
    ],
    styleProfileSummary: {
      source: "defaults",
      corpusSize: 0,
      charsMedian: 220,
      charsP90: 380,
      linesMedian: 4,
      emojisPerPostMedian: 2,
      hashtagPosition: "end",
      topEmojis: [],
      fingerprints: [],
      hookPatterns: [],
      ctas: [],
      overused: [],
    },
    ...patch,
  };
}

export function refineBody(patch: Partial<RefineRequest> = {}): RefineRequest {
  const base = generateBody();
  return {
    provider: "anthropic",
    brief: base.brief,
    facts: base.facts,
    rules: base.rules,
    hashtags: base.hashtags,
    broadcasters: base.broadcasters,
    lint: base.lint,
    references: [],
    action: "new_hook",
    text: "💥 KO de Karim Fictif !\n\nKarim Fictif termine Tom Essai au 1er round.\n\n#HexagoneMMA",
    ...patch,
  };
}

/** Les trois variantes qu'un modèle pourrait renvoyer. */
export function variantsJson(storytellingText?: string): string {
  return JSON.stringify({
    variants: [
      {
        kind: "punchy",
        hook: "💥 KO de Karim Fictif !",
        text: "💥 KO de Karim Fictif !\n\nTom Essai ne se relève pas.\n\n#HexagoneMMA",
        usedFacts: ["Karim Fictif", "Tom Essai", "KO"],
      },
      {
        kind: "signature",
        hook: "🔥 Karim Fictif s'impose par KO au 1er round.",
        text: "🔥 Karim Fictif s'impose par KO au 1er round.\n\nArrêt à 3:12 face à Tom Essai.\n\n#HexagoneMMA",
        usedFacts: ["Karim Fictif", "KO", "1er round", "3:12"],
      },
      {
        kind: "storytelling",
        hook: "⚡ Une fin nette.",
        text:
          storytellingText ??
          "⚡ Une fin nette.\n\nKarim Fictif a trouvé l'ouverture face à Tom Essai.\n\nLe KO tombe au 1er round.\n\n#HexagoneMMA",
        usedFacts: ["Karim Fictif", "Tom Essai"],
      },
    ],
  });
}

export function anthropicMessage(text: string, stopReason = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [{ type: "text", text }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

export function openaiResponse(text: string) {
  return {
    id: "resp_test",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "gpt-test",
    output: [
      {
        type: "message",
        id: "msg_test",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
    usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
  };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export interface RecordedCall {
  url: string;
  headers: Headers;
  body: unknown;
}

/** Remplace `fetch` : chaque appel reçoit la réponse suivante de la liste. */
export function mockFetch(
  ...responses: (Response | ((signal?: AbortSignal) => Promise<Response>))[]
) {
  const calls: RecordedCall[] = [];
  const queue = [...responses];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const text = await request.text();
    calls.push({
      url: request.url,
      headers: request.headers,
      body: text ? JSON.parse(text) : undefined,
    });
    // La dernière réponse sert pour tous les appels suivants.
    const next = (queue.length > 1 ? queue.shift() : queue[0]) ?? json({}, 500);
    return typeof next === "function" ? next(init?.signal ?? undefined) : next.clone();
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

export function routeRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
