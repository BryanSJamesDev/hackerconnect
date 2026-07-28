import type { ChemistrySignals } from "@/lib/domain/types";

/** Point values applied when a user submits post-event feedback about a teammate. */
export const FEEDBACK_POINTS = {
  won: 25,
  fun: 8,
  neutral: 0,
  friction: -10,
} as const;

/**
 * Deterministic base chemistry score (0-100) from raw collaboration signals.
 * This is the "rules" half of the hybrid model — Groq only reasons over and
 * explains this score, it never invents it.
 */
export function baseChemistryScore(signals: ChemistrySignals): number {
  const raw =
    10 +
    signals.githubCollabs * 1.5 +
    signals.slackInteractions * 0.15 +
    signals.eventsAttendedTogether * 5 +
    signals.hackathonsWonTogether * 25;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Derives an experience level (1-5) from events attended and hackathons won. */
export function experienceLevel(eventsAttended: number, hackathonsWon: number): number {
  const raw = 1 + Math.floor(eventsAttended / 2) + hackathonsWon;
  return Math.max(1, Math.min(5, raw));
}
