import type { PipelineConfig } from "rocketride";

/**
 * The rationale agent's pipeline definition (webhook -> Groq via RocketRide's
 * native llm_openai_api node -> response). Mirrors rocketride/rationale-pipeline.json
 * but builds the config in code so real secrets never need to live in a
 * committed file — the JSON file is the human-readable reference copy.
 */
export function buildRationalePipelineConfig(): PipelineConfig {
  return {
    description: "HackerConnect rationale agent",
    version: 1,
    source: "input_webhook",
    components: [
      { id: "input_webhook", provider: "webhook", config: {} },
      {
        id: "rationale_llm",
        provider: "llm_openai_api",
        config: {
          apikey: process.env.GROQ_API_KEY,
          base_url: "https://api.groq.com/openai/v1",
          model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
          modelTotalTokens: 32768,
        },
        input: [{ lane: "questions", from: "input_webhook" }],
      },
      {
        id: "send_response",
        provider: "response",
        config: {},
        input: [{ lane: "answers", from: "rationale_llm" }],
      },
    ],
  };
}
