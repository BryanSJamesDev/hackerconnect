import Groq from "groq-sdk";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

/**
 * Runs a chat completion against the Groq-hosted model configured for
 * HackerConnect (see GROQ_MODEL). Used to reason over HydraDB-retrieved
 * context and produce ranked teammate/event suggestions.
 */
export async function chatJSON<T>(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<T> {
  const completion = await getClient().chat.completions.create({
    model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    temperature: params.temperature ?? 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty completion");
  return JSON.parse(content) as T;
}
