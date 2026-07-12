// BYOK ("bring your own key") AI provider layer.
//
// Two wire protocols cover practically every provider:
//   - "anthropic":          the Anthropic Messages API
//   - "openai-compatible":  OpenAI-style /chat/completions — OpenAI, OpenRouter,
//                           Groq, Mistral, Together, Ollama, LM Studio, vLLM, …
//
// The key + base URL + model live in localStorage ONLY (never in graph.json,
// never sent anywhere except the endpoint the user configured). Calls go
// directly from the browser to the provider; if a provider doesn't allow
// browser CORS, point baseUrl at a proxy you trust (OpenRouter and Ollama
// work out of the box).

export type ProviderKind = "anthropic" | "openai-compatible";

export interface AIConfig {
  kind: ProviderKind;
  baseUrl: string; // e.g. https://api.anthropic.com · https://openrouter.ai/api/v1
  apiKey: string;
  model: string;
}

export interface ProviderPreset {
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string; // sensible default, user-editable
  note?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-5",
  },
  {
    label: "OpenAI",
    kind: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  {
    label: "OpenRouter (any model)",
    kind: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-sonnet-4.5",
    note: "one key, hundreds of models; browser-friendly CORS",
  },
  {
    label: "Groq",
    kind: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    label: "Ollama (local)",
    kind: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
    note: "no key needed; runs on your machine",
  },
  {
    label: "Custom (OpenAI-compatible)",
    kind: "openai-compatible",
    baseUrl: "",
    model: "",
    note: "any endpoint that speaks /chat/completions",
  },
];

const STORAGE_KEY = "axiomer_ai_config";

export function loadAIConfig(): AIConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as AIConfig;
    if (
      (parsed.kind === "anthropic" || parsed.kind === "openai-compatible") &&
      typeof parsed.baseUrl === "string" &&
      typeof parsed.apiKey === "string" &&
      typeof parsed.model === "string"
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearAIConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`;
}

// One completion: system + user in, assistant text out.
export async function chatComplete(
  config: AIConfig,
  system: string,
  user: string,
): Promise<string> {
  if (config.kind === "anthropic") {
    const base = (config.baseUrl || "https://api.anthropic.com").replace(/\/$/, "");
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        // Required for direct browser calls; the key is the user's own.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 3000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
    if (!text) throw new Error("empty response from provider");
    return text;
  }

  // openai-compatible
  const base = config.baseUrl.replace(/\/$/, "");
  if (!base) throw new Error("base URL is required");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty response from provider");
  return text;
}
