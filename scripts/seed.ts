import {
  PROFILES,
  PAST_EVENTS,
  UPCOMING_EVENTS,
  PROJECTS,
  GITHUB_COLLABS,
  SLACK_THREADS,
  UPCOMING_RSVPS,
} from "../src/lib/synthetic/dataset";
import {
  buildGmailRecords,
  buildLinearRecords,
  buildGithubRecords,
  buildSlackRecords,
} from "../src/lib/synthetic/narratives";
import { ingestRecords } from "../src/lib/hydradb/client";
import { baseChemistryScore, experienceLevel } from "../src/lib/chemistry/scoring";
import type { ChemistrySignals } from "../src/lib/domain/types";

const HYDRA_COLLECTION = "hackerconnect";

async function rawSql<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(`${process.env.INSFORGE_BASE_URL}/api/database/advance/rawsql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, params }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`InsForge rawsql failed: ${JSON.stringify(json)}`);
  }
  return json.rows as T[];
}

function isoDate(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

async function seedInsForge() {
  console.log("Clearing previous seed data...");
  for (const table of [
    "event_feedback",
    "chemistry_edges",
    "project_members",
    "projects",
    "event_attendance",
    "events",
    "profiles",
  ]) {
    await rawSql(`delete from public.${table}`);
  }

  console.log("Inserting profiles...");
  const profileIdBySlug = new Map<string, string>();
  for (const p of PROFILES) {
    const rows = await rawSql<{ id: string }>(
      `insert into public.profiles (name, qualification, interests, bio)
       values ($1, $2, $3, $4) returning id`,
      [p.name, p.qualification, p.interests, p.bio]
    );
    profileIdBySlug.set(p.slug, rows[0].id);
  }

  console.log("Inserting events...");
  const eventIdBySlug = new Map<string, string>();
  for (const e of [...PAST_EVENTS, ...UPCOMING_EVENTS]) {
    const rows = await rawSql<{ id: string }>(
      `insert into public.events (name, event_date, location) values ($1, $2, $3) returning id`,
      [e.name, isoDate(e.dayOffset), e.location]
    );
    eventIdBySlug.set(e.slug, rows[0].id);
  }

  console.log("Inserting projects + members + past-event attendance...");
  const projectIdBySlug = new Map<string, string>();
  const eventsAttended = new Map<string, Set<string>>(); // profileSlug -> eventSlugs
  const hackathonsWon = new Map<string, number>();

  for (const proj of PROJECTS) {
    const eventId = eventIdBySlug.get(proj.eventSlug)!;
    const rows = await rawSql<{ id: string }>(
      `insert into public.projects (event_id, name, won) values ($1, $2, $3) returning id`,
      [eventId, proj.name, proj.won]
    );
    const projectId = rows[0].id;
    projectIdBySlug.set(proj.slug, projectId);

    for (const memberSlug of proj.memberSlugs) {
      const profileId = profileIdBySlug.get(memberSlug)!;
      await rawSql(
        `insert into public.project_members (project_id, profile_id) values ($1, $2)`,
        [projectId, profileId]
      );
      await rawSql(
        `insert into public.event_attendance (event_id, profile_id) values ($1, $2)
         on conflict do nothing`,
        [eventId, profileId]
      );

      if (!eventsAttended.has(memberSlug)) eventsAttended.set(memberSlug, new Set());
      eventsAttended.get(memberSlug)!.add(proj.eventSlug);
      if (proj.won) hackathonsWon.set(memberSlug, (hackathonsWon.get(memberSlug) ?? 0) + 1);
    }
  }

  console.log("Inserting upcoming-event RSVPs (Gmail-discovered attendance)...");
  for (const rsvp of UPCOMING_RSVPS) {
    await rawSql(
      `insert into public.event_attendance (event_id, profile_id) values ($1, $2)
       on conflict do nothing`,
      [eventIdBySlug.get(rsvp.eventSlug)!, profileIdBySlug.get(rsvp.profileSlug)!]
    );
  }

  console.log("Computing + inserting chemistry edges...");
  const pairSignals = new Map<string, ChemistrySignals>();
  const pairKey = (a: string, b: string) => [a, b].sort().join("::");

  for (const collab of GITHUB_COLLABS) {
    const key = pairKey(...collab.pair);
    const s = pairSignals.get(key) ?? { githubCollabs: 0, slackInteractions: 0, eventsAttendedTogether: 0, hackathonsWonTogether: 0 };
    s.githubCollabs += collab.commitsTogether;
    pairSignals.set(key, s);
  }
  for (const thread of SLACK_THREADS) {
    const key = pairKey(...thread.pair);
    const s = pairSignals.get(key) ?? { githubCollabs: 0, slackInteractions: 0, eventsAttendedTogether: 0, hackathonsWonTogether: 0 };
    s.slackInteractions += thread.messageCount;
    pairSignals.set(key, s);
  }
  for (const proj of PROJECTS) {
    for (let i = 0; i < proj.memberSlugs.length; i++) {
      for (let j = i + 1; j < proj.memberSlugs.length; j++) {
        const key = pairKey(proj.memberSlugs[i], proj.memberSlugs[j]);
        const s = pairSignals.get(key) ?? { githubCollabs: 0, slackInteractions: 0, eventsAttendedTogether: 0, hackathonsWonTogether: 0 };
        s.eventsAttendedTogether += 1;
        if (proj.won) s.hackathonsWonTogether += 1;
        pairSignals.set(key, s);
      }
    }
  }

  for (const [key, signals] of pairSignals) {
    const [slugA, slugB] = key.split("::");
    const idA = profileIdBySlug.get(slugA)!;
    const idB = profileIdBySlug.get(slugB)!;
    const [userA, userB] = [idA, idB].sort();
    const score = baseChemistryScore(signals);
    await rawSql(
      `insert into public.chemistry_edges
        (user_a, user_b, score, github_collabs, slack_interactions, events_attended_together, hackathons_won_together)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [userA, userB, score, signals.githubCollabs, signals.slackInteractions, signals.eventsAttendedTogether, signals.hackathonsWonTogether]
    );
  }

  console.log("Updating profile experience levels...");
  for (const p of PROFILES) {
    const attended = eventsAttended.get(p.slug)?.size ?? 0;
    const won = hackathonsWon.get(p.slug) ?? 0;
    await rawSql(
      `update public.profiles set events_attended = $1, hackathons_won = $2, experience_level = $3 where id = $4`,
      [attended, won, experienceLevel(attended, won), profileIdBySlug.get(p.slug)!]
    );
  }

  console.log("InsForge seed complete.");
}

async function seedHydraDB() {
  console.log("Ingesting Gmail records...");
  await ingestRecords(HYDRA_COLLECTION, buildGmailRecords());
  console.log("Ingesting Linear records...");
  await ingestRecords(HYDRA_COLLECTION, buildLinearRecords());
  console.log("Ingesting GitHub records...");
  await ingestRecords(HYDRA_COLLECTION, buildGithubRecords());
  console.log("Ingesting Slack records...");
  await ingestRecords(HYDRA_COLLECTION, buildSlackRecords());
  console.log("HydraDB ingest complete (indexing is async; give it a few seconds before querying).");
}

async function main() {
  await seedInsForge();
  await seedHydraDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
