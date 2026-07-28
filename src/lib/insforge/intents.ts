/**
 * Agent intent profiles, stored in InsForge's `agent_intents` table.
 * These declare what each agent in the pipeline is allowed to read/write
 * and how it should behave — the "enterprise intent" InsForge is meant to
 * manage across the dev-to-deploy lifecycle for this app.
 */
export const AGENT_INTENTS = [
  {
    id: "teammate-matcher",
    name: "TeammateMatcher",
    description:
      "Ranks candidate teammates for a profile's next event using chemistry signals (GitHub co-authorship, Slack interaction, past event/hackathon outcomes) plus HydraDB-retrieved context.",
    reads: ["profiles", "chemistry_edges", "event_attendance", "hydradb:github", "hydradb:slack", "hydradb:linear"],
    writes: [],
    config: {
      model: "groq:llama-3.1-8b-instant",
      max_candidates: 5,
    },
  },
  {
    id: "event-suggester",
    name: "EventSuggester",
    description:
      "Surfaces upcoming events (discovered via Gmail scraping) that a profile hasn't registered for but where high-chemistry connections are attending.",
    reads: ["profiles", "chemistry_edges", "events", "event_attendance", "hydradb:gmail", "hydradb:linear"],
    writes: [],
    config: {
      model: "groq:llama-3.1-8b-instant",
      max_events: 3,
    },
  },
  {
    id: "chemistry-updater",
    name: "ChemistryUpdater",
    description:
      "Applies deterministic point adjustments to chemistry_edges after a user submits post-event feedback (win/fun/neutral/friction).",
    reads: ["event_feedback"],
    writes: ["chemistry_edges", "profiles.experience_level"],
    config: {
      win_points: 25,
      fun_points: 8,
      friction_points: -10,
    },
  },
] as const;
