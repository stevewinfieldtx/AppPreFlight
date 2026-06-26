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

// Some models ignore json mode and wrap their output in code fences or add a
// sentence of commentary. Pull the actual JSON object out before parsing so a
// completed interview never dies on a JSON.parse error.
function extractJson(raw: string): string {
  let s = raw.trim();

  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) s = fenced[1].trim();

  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);

  return s.trim();
}

export async function callOpenRouterJSON(prompt: string) {
  const raw = await callOpenRouter(
    [
      { role: "system", content: "Return valid JSON only. No markdown. No commentary." },
      { role: "user", content: prompt }
    ],
    { temperature: 0.3, jsonMode: true }
  );

  const cleaned = extractJson(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: try the unmodified payload before giving up.
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        "Model did not return valid JSON. First 200 chars: " + raw.slice(0, 200)
      );
    }
  }
}
