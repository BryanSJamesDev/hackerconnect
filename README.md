# Vibe-Pair

Built for the **Agents You Love** hackathon (2026-07-28, Frontier Tower).

Vibe-Pair answers one question live: **"What's my next event, and who should I team with there?"**
It's deliberately a question no single connector can answer — teammate chemistry lives in GitHub/Slack/Linear,
event discovery lives in Gmail, and the useful answer requires joining across both.

> Note: the hackathon's original four mandatory technologies were Pipeshift, HydraDB, RocketRide, and
> InsForge. Organizers removed **Pipeshift** as a requirement mid-event (no access) — inference runs on
> **Groq** instead, hosted inside a RocketRide-managed pipeline. HydraDB, RocketRide, and InsForge remain
> mandatory and are all load-bearing below.

## The demo

1. Pick a profile (Jordan Alvarez is the scripted golden path) and click **"Ask (all sources)."**
   The app answers from live HydraDB retrieval across GitHub, Slack, Linear, and Gmail: it ranks
   teammates by real collaboration evidence and picks the next event your highest-chemistry connections
   are actually attending.
2. Set the **kill shot** scope to a single connector (e.g. Gmail) and click **"Re-run scoped."** The
   same question, answered from one source, visibly degrades: teammate ranking disappears (co-attending
   a future event isn't collaboration evidence) or event discovery disappears (no Gmail data), and the
   UI explicitly reports what evidence was missing.

## Architecture — how each mandatory technology is load-bearing

### HydraDB — real-time grounding
- `src/lib/hydradb/client.ts` — ingest + query wrapper.
- `scripts/seed.ts` seeds ~30 synthetic GitHub/Slack/Linear/Gmail records via HydraDB's `/context/ingest`
  API (`app_knowledge`, tagged `metadata.connector`), live — no real OAuth connections, but genuinely
  indexed and queried at runtime, not hardcoded into the app.
- `src/lib/pipeline/heroQuery.ts` runs the actual join: one HydraDB query gathers collaboration evidence
  (GitHub/Slack/Linear), a second gathers Gmail RSVP evidence for the resulting candidates. The **kill
  shot** works by passing `metadata_filters: { connector }` to `/query` to restrict either stage to a
  single source — this is what makes the answer degrade live, not a canned second response.

### InsForge — enterprise intent + backend
- `src/lib/insforge/schema.sql` — Postgres schema (profiles, events, chemistry_edges, event_feedback,
  agent_intents), applied via InsForge's raw-SQL endpoint (`scripts/setup-insforge.ts`).
- `src/lib/insforge/intents.ts` — three agent intent profiles (`TeammateMatcher`, `EventSuggester`,
  `ChemistryUpdater`) stored in the `agent_intents` table, declaring what each agent reads/writes.
- Runtime CRUD (profiles, chemistry cache, feedback) goes through the `@insforge/sdk` admin client in
  `src/lib/insforge/queries.ts`, used by every API route under `src/app/api/`.
- The feedback loop (`ChemistryUpdater`) is real: submitting event feedback in the UI applies a
  deterministic point adjustment (win +25, fun +8, friction -10) to `chemistry_edges` and recomputes
  `experience_level` — verified live in `src/lib/chemistry/scoring.ts`.

### RocketRide Cloud — managed pipeline
- `rocketride/rationale-pipeline.json` (built at runtime in `src/lib/rocketride/pipeline.ts` so secrets
  never live in the committed file) defines a pipeline: `webhook -> llm_openai_api (pointed at Groq) ->
  response`, deployed and run against `wss://api.rocketride.ai` — not a local script.
- `src/lib/rocketride/client.ts` maintains a persistent RocketRide connection and calls this pipeline via
  `client.chat()` for the rationale-writing step of every hero query. This step is intentionally scoped
  narrow: all ranking/scoring/event-selection is deterministic code (reused from `chemistry/scoring.ts`)
  run against live HydraDB evidence, and RocketRide's Groq-backed agent is only asked to turn already-
  decided facts into natural-language rationale — a small, fast model doing multi-constraint reasoning
  under time pressure was unreliable, so the correctness-critical logic stays in code and the LLM does
  what LLMs are actually good at.

## Stack

Next.js 16 (TypeScript, App Router) · Tailwind v4 · Groq (`llama-3.1-8b-instant`) via RocketRide's
`llm_openai_api` node · HydraDB v2 API · InsForge (`@insforge/sdk`) · `rocketride` npm SDK.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in HYDRADB_API_KEY, GROQ_API_KEY, INSFORGE_API_KEY, ROCKETRIDE_API_KEY, INSFORGE_BASE_URL
npm run setup:insforge              # provisions schema + agent intents
npm run seed                        # seeds InsForge + HydraDB with the demo dataset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick **Jordan Alvarez** in the profile switcher, and
run the hero query.
