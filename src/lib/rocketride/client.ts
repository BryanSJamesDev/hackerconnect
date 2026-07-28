import { RocketRideClient, Question } from "rocketride";
import { buildRationalePipelineConfig } from "./pipeline";

let clientPromise: Promise<{ client: RocketRideClient; token: string }> | null = null;

/**
 * Lazily connects to RocketRide Cloud and starts the rationale pipeline once,
 * reusing the same task token across requests (matches the "long-lived app"
 * pattern from RocketRide's docs) instead of paying a fresh WebSocket +
 * pipeline-startup cost on every hero query.
 */
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new RocketRideClient({
        auth: process.env.ROCKETRIDE_API_KEY,
        uri: "wss://api.rocketride.ai",
        persist: true,
      });
      await client.connect();
      const { token } = await client.use({ pipeline: buildRationalePipelineConfig() });
      return { client, token };
    })();
  }
  return clientPromise;
}

function stripJsonFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Runs the rationale-writing step of the HackerConnect pipeline on
 * RocketRide Cloud's managed runtime (webhook -> llm_openai_api(Groq) ->
 * response). This node is only ever asked to turn already-decided,
 * already-scored evidence into prose — see src/lib/pipeline/heroQuery.ts.
 */
export async function runRationaleAgent<T>(system: string, userContent: string): Promise<T> {
  const { client, token } = await getClient();

  const question = new Question({ expectJson: true });
  question.addInstruction("Role", system);
  question.addQuestion(userContent);

  const response = await client.chat({ token, question });
  const raw = (response as { data?: { answer?: unknown } })?.data?.answer ?? response?.answers?.[0];
  if (raw === undefined || raw === null) {
    throw new Error(`RocketRide rationale agent returned no answer: ${JSON.stringify(response)}`);
  }

  if (typeof raw === "object") return raw as T;
  return JSON.parse(stripJsonFences(String(raw))) as T;
}
