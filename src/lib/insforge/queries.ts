import { insforge } from "./client";
import { FEEDBACK_POINTS, experienceLevel } from "@/lib/chemistry/scoring";
import type { Profile } from "@/lib/domain/types";

interface ProfileRow {
  id: string;
  name: string;
  qualification: string;
  interests: string[];
  bio: string;
  experience_level: number;
  events_attended: number;
  hackathons_won: number;
  created_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    qualification: row.qualification,
    interests: row.interests,
    bio: row.bio,
    experienceLevel: row.experience_level,
    eventsAttended: row.events_attended,
    hackathonsWon: row.hackathons_won,
    createdAt: row.created_at,
  };
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await insforge()
    .database.from("profiles")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(`listProfiles failed: ${JSON.stringify(error)}`);
  return (data as ProfileRow[]).map(toProfile);
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await insforge().database.from("profiles").select("*").eq("id", id);
  if (error) throw new Error(`getProfile failed: ${JSON.stringify(error)}`);
  const row = (data as ProfileRow[])?.[0];
  return row ? toProfile(row) : null;
}

export interface ChemistryConnection {
  profileId: string;
  name: string;
  score: number;
}

export async function listChemistryConnections(profileId: string): Promise<ChemistryConnection[]> {
  const db = insforge().database;
  const [asA, asB] = await Promise.all([
    db.from("chemistry_edges").select("user_b, score").eq("user_a", profileId),
    db.from("chemistry_edges").select("user_a, score").eq("user_b", profileId),
  ]);
  if (asA.error) throw new Error(`listChemistryConnections failed: ${JSON.stringify(asA.error)}`);
  if (asB.error) throw new Error(`listChemistryConnections failed: ${JSON.stringify(asB.error)}`);

  const otherIds: { id: string; score: number }[] = [
    ...(asA.data as { user_b: string; score: number }[]).map((r) => ({ id: r.user_b, score: r.score })),
    ...(asB.data as { user_a: string; score: number }[]).map((r) => ({ id: r.user_a, score: r.score })),
  ];
  if (otherIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, name")
    .in("id", otherIds.map((o) => o.id));
  if (profilesError) throw new Error(`listChemistryConnections failed: ${JSON.stringify(profilesError)}`);
  const nameById = new Map((profiles as { id: string; name: string }[]).map((p) => [p.id, p.name]));

  return otherIds
    .map((o) => ({ profileId: o.id, name: nameById.get(o.id) ?? "Unknown", score: o.score }))
    .sort((a, b) => b.score - a.score);
}

export interface NewProfileInput {
  name: string;
  qualification: string;
  interests: string[];
  bio: string;
}

export async function createProfile(input: NewProfileInput): Promise<Profile> {
  const { data, error } = await insforge()
    .database.from("profiles")
    .insert({ ...input, experience_level: 1, events_attended: 0, hackathons_won: 0 })
    .select();
  if (error) throw new Error(`createProfile failed: ${JSON.stringify(error)}`);
  return toProfile((data as ProfileRow[])[0]);
}

export interface EventSummary {
  id: string;
  name: string;
  eventDate: string;
  location: string;
}

export async function listEvents(): Promise<EventSummary[]> {
  const { data, error } = await insforge()
    .database.from("events")
    .select("id, name, event_date, location")
    .order("event_date", { ascending: false });
  if (error) throw new Error(`listEvents failed: ${JSON.stringify(error)}`);
  return (data as { id: string; name: string; event_date: string; location: string }[]).map((e) => ({
    id: e.id,
    name: e.name,
    eventDate: e.event_date,
    location: e.location,
  }));
}

export interface FeedbackInput {
  eventId: string;
  profileId: string;
  teammateId: string;
  outcome: "won" | "fun" | "neutral" | "friction";
  note?: string;
}

/**
 * Implements the ChemistryUpdater intent profile: records feedback, then
 * deterministically nudges the chemistry_edges score by the configured
 * point value for the outcome (see FEEDBACK_POINTS).
 */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const db = insforge().database;

  const { error: feedbackError } = await db.from("event_feedback").insert({
    event_id: input.eventId,
    profile_id: input.profileId,
    teammate_id: input.teammateId,
    outcome: input.outcome,
    note: input.note ?? null,
  });
  if (feedbackError) throw new Error(`submitFeedback insert failed: ${JSON.stringify(feedbackError)}`);

  const [userA, userB] = [input.profileId, input.teammateId].sort();
  const points = FEEDBACK_POINTS[input.outcome];

  const { data: existing, error: existingError } = await db
    .from("chemistry_edges")
    .select("score")
    .eq("user_a", userA)
    .eq("user_b", userB);
  if (existingError) throw new Error(`submitFeedback lookup failed: ${JSON.stringify(existingError)}`);

  const currentScore = (existing as { score: number }[])?.[0]?.score ?? 10;
  const nextScore = Math.max(0, Math.min(100, currentScore + points));

  if ((existing as unknown[])?.length > 0) {
    const { error } = await db
      .from("chemistry_edges")
      .update({ score: nextScore, last_updated: new Date().toISOString() })
      .eq("user_a", userA)
      .eq("user_b", userB);
    if (error) throw new Error(`submitFeedback update failed: ${JSON.stringify(error)}`);
  } else {
    const { error } = await db.from("chemistry_edges").insert({ user_a: userA, user_b: userB, score: nextScore });
    if (error) throw new Error(`submitFeedback insert-edge failed: ${JSON.stringify(error)}`);
  }

  if (input.outcome === "won" || input.outcome === "fun") {
    const { data: profileRows, error: profileError } = await db
      .from("profiles")
      .select("events_attended, hackathons_won")
      .eq("id", input.profileId);
    if (profileError) throw new Error(`submitFeedback profile lookup failed: ${JSON.stringify(profileError)}`);
    const profileRow = (profileRows as { events_attended: number; hackathons_won: number }[])?.[0];
    if (profileRow) {
      const eventsAttended = profileRow.events_attended + (input.outcome === "won" ? 1 : 0);
      const hackathonsWon = profileRow.hackathons_won + (input.outcome === "won" ? 1 : 0);
      const { error } = await db
        .from("profiles")
        .update({
          events_attended: eventsAttended,
          hackathons_won: hackathonsWon,
          experience_level: experienceLevel(eventsAttended, hackathonsWon),
        })
        .eq("id", input.profileId);
      if (error) throw new Error(`submitFeedback profile update failed: ${JSON.stringify(error)}`);
    }
  }
}
