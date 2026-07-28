import type { AppKnowledgeRecord } from "@/lib/hydradb/client";
import {
  PROFILES,
  PAST_EVENTS,
  UPCOMING_EVENTS,
  PROJECTS,
  GITHUB_COLLABS,
  SLACK_THREADS,
  UPCOMING_RSVPS,
} from "./dataset";

function profileName(slug: string): string {
  return PROFILES.find((p) => p.slug === slug)!.name;
}

function eventBySlug(slug: string) {
  return [...PAST_EVENTS, ...UPCOMING_EVENTS].find((e) => e.slug === slug)!;
}

function isoDate(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

/** Gmail: event invites + RSVP replies — the only signal for event discovery. */
export function buildGmailRecords(): AppKnowledgeRecord[] {
  const records: AppKnowledgeRecord[] = [];
  const allEvents = [...PAST_EVENTS, ...UPCOMING_EVENTS];

  for (const event of allEvents) {
    records.push({
      id: `gmail-invite-${event.slug}`,
      title: `Invite: ${event.name}`,
      connector: "gmail",
      text: `Subject: You're invited — ${event.name}\nDate: ${isoDate(event.dayOffset)}\nLocation: ${event.location}\nJoin fellow builders for ${event.name}, a community hackathon event.`,
      metadata: { event_slug: event.slug, event_name: event.name },
    });
  }

  for (const rsvp of UPCOMING_RSVPS) {
    const event = eventBySlug(rsvp.eventSlug);
    records.push({
      id: `gmail-rsvp-${rsvp.eventSlug}-${rsvp.profileSlug}`,
      title: `RSVP: ${profileName(rsvp.profileSlug)} -> ${event.name}`,
      connector: "gmail",
      text: `Subject: Re: You're invited — ${event.name}\nFrom: ${profileName(rsvp.profileSlug)}\n"Count me in for ${event.name} on ${isoDate(event.dayOffset)}!"`,
      metadata: { event_slug: event.slug, event_name: event.name, profile_slug: rsvp.profileSlug, profile_name: profileName(rsvp.profileSlug) },
    });
  }

  return records;
}

/** Linear: one ticket per hackathon project, carrying the team + outcome. */
export function buildLinearRecords(): AppKnowledgeRecord[] {
  return PROJECTS.map((project) => {
    const event = eventBySlug(project.eventSlug);
    const members = project.memberSlugs.map(profileName);
    return {
      id: `linear-${project.slug}`,
      title: `${project.name} (${event.name})`,
      connector: "linear",
      text: `Project: ${project.name}\nHackathon: ${event.name}\nTeam: ${members.join(", ")}\nStatus: ${project.won ? "Won 1st place" : "Shipped, no award"}`,
      metadata: {
        event_slug: event.slug,
        event_name: event.name,
        project_slug: project.slug,
        won: project.won,
        profile_slugs: project.memberSlugs.join(","),
      },
    } satisfies AppKnowledgeRecord;
  });
}

/** GitHub: pairwise co-authorship signal per project. */
export function buildGithubRecords(): AppKnowledgeRecord[] {
  return GITHUB_COLLABS.map((collab) => {
    const project = PROJECTS.find((p) => p.slug === collab.projectSlug)!;
    const event = eventBySlug(project.eventSlug);
    const [a, b] = collab.pair;
    return {
      id: `github-${collab.projectSlug}-${a}-${b}`,
      title: `${profileName(a)} & ${profileName(b)} on ${project.name}`,
      connector: "github",
      text: `Repo: ${project.name}\n${profileName(a)} and ${profileName(b)} co-authored ${collab.commitsTogether} commits and reviewed ${collab.prsReviewed} of each other's pull requests together on ${project.name} during ${event.name}.`,
      metadata: {
        event_slug: event.slug,
        project_slug: project.slug,
        profile_slugs: `${a},${b}`,
        commits_together: collab.commitsTogether,
      },
    } satisfies AppKnowledgeRecord;
  });
}

/** Slack: pairwise communication volume + tone during an event's team channel. */
export function buildSlackRecords(): AppKnowledgeRecord[] {
  return SLACK_THREADS.map((thread) => {
    const event = eventBySlug(thread.eventSlug);
    const [a, b] = thread.pair;
    return {
      id: `slack-${thread.eventSlug}-${a}-${b}`,
      title: `#${thread.eventSlug}-team: ${profileName(a)} & ${profileName(b)}`,
      connector: "slack",
      text: `Channel: #${thread.eventSlug}-team\n${profileName(a)} and ${profileName(b)} exchanged ${thread.messageCount} messages during ${event.name}. Tone: ${thread.sentiment}. ${thread.summary}`,
      metadata: {
        event_slug: event.slug,
        profile_slugs: `${a},${b}`,
        sentiment: thread.sentiment,
        message_count: thread.messageCount,
      },
    } satisfies AppKnowledgeRecord;
  });
}
