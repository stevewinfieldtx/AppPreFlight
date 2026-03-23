// /lib/openrouter.ts

export async function callOpenRouter(
  messages: Array<{ role: "system" | "assistant" | "user"; content: string }>,
  options?: { temperature?: number; jsonMode?: boolean }
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL_ID;

  if (!apiKey || !model) {
    throw new Error("Missing OPENROUTER_API_KEY or OPENROUTER_MODEL_ID");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.6
  };

  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error: ${resp.status} ${text}`);
  }

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from model");
  return String(content);
}

export async function callOpenRouterJSON(prompt: string) {
  const raw = await callOpenRouter(
    [
      { role: "system", content: "Return valid JSON only. No markdown. No commentary." },
      { role: "user", content: prompt }
    ],
    { temperature: 0.3, jsonMode: true }
  );
  return JSON.parse(raw);
}
