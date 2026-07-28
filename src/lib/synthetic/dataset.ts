/**
 * Deterministic synthetic community used to seed InsForge (structured
 * profiles/events/chemistry) and HydraDB (connector-tagged narrative
 * records) for the demo. Not randomly generated — kept fixed so the
 * 90-second demo answer is reproducible.
 */

export interface SeedProfile {
  slug: string;
  name: string;
  qualification: string;
  interests: string[];
  bio: string;
}

export const PROFILES: SeedProfile[] = [
  { slug: "jordan", name: "Jordan Alvarez", qualification: "BS Computer Science", interests: ["ai", "backend", "hackathons"], bio: "Full-stack builder who ships fast and loves a good hackathon sprint." },
  { slug: "priya", name: "Priya Nair", qualification: "MS Machine Learning", interests: ["ai", "ml", "data"], bio: "ML engineer focused on applied retrieval and agent systems." },
  { slug: "sam", name: "Sam Chen", qualification: "BFA Interaction Design", interests: ["design", "frontend", "ai"], bio: "Frontend engineer with a design background, obsessed with polish." },
  { slug: "marcus", name: "Marcus Webb", qualification: "BS Computer Engineering", interests: ["infra", "backend", "security"], bio: "Infra and backend generalist, keeps things running under load." },
  { slug: "aisha", name: "Aisha Rahman", qualification: "MBA, Product", interests: ["product", "design", "ux"], bio: "Product-minded builder who turns rough ideas into clear specs." },
  { slug: "leo", name: "Leo Kim", qualification: "MS Data Science", interests: ["data", "ml", "viz"], bio: "Data scientist who loves turning messy datasets into a story." },
  { slug: "nadia", name: "Nadia Ortiz", qualification: "BS Software Engineering", interests: ["mobile", "frontend", "design"], bio: "Mobile-first engineer, ships polished cross-platform apps." },
  { slug: "devon", name: "Devon Price", qualification: "BS Cybersecurity", interests: ["security", "backend", "infra"], bio: "Security-minded engineer, finds the edge cases before judges do." },
  { slug: "yuki", name: "Yuki Tanaka", qualification: "PhD Candidate, AI", interests: ["ai", "research", "ml"], bio: "AI researcher prototyping agent architectures between papers." },
  { slug: "chris", name: "Chris Bailey", qualification: "BS Information Systems", interests: ["growth", "backend", "ai"], bio: "Growth-and-backend hybrid, likes projects with a clear business hook." },
];

export interface SeedEvent {
  slug: string;
  name: string;
  /** ISO offset in days from "today" at seed time (negative = past). */
  dayOffset: number;
  location: string;
}

export const PAST_EVENTS: SeedEvent[] = [
  { slug: "cityhacks-spring", name: "CityHacks Spring", dayOffset: -95, location: "Frontier Tower, SF" },
  { slug: "open-source-weekend", name: "Open Source Weekend", dayOffset: -60, location: "Remote" },
  { slug: "datajam", name: "DataJam", dayOffset: -30, location: "Frontier Tower, SF" },
];

export const UPCOMING_EVENTS: SeedEvent[] = [
  { slug: "ai-builders-sprint", name: "AI Builders Sprint", dayOffset: 5, location: "Frontier Tower, SF" },
  { slug: "founders-weekend-hack", name: "Founders Weekend Hack", dayOffset: 12, location: "South Park, SF" },
];

export interface SeedProject {
  slug: string;
  name: string;
  eventSlug: string;
  memberSlugs: string[];
  won: boolean;
}

export const PROJECTS: SeedProject[] = [
  { slug: "swiftserve", name: "SwiftServe", eventSlug: "cityhacks-spring", memberSlugs: ["jordan", "priya", "sam"], won: true },
  { slug: "patchbot", name: "PatchBot", eventSlug: "open-source-weekend", memberSlugs: ["jordan", "marcus"], won: false },
  { slug: "flowviz", name: "FlowViz", eventSlug: "datajam", memberSlugs: ["priya", "leo", "yuki"], won: true },
];

export interface SeedGithubCollab {
  pair: [string, string];
  projectSlug: string;
  commitsTogether: number;
  prsReviewed: number;
}

export const GITHUB_COLLABS: SeedGithubCollab[] = [
  { pair: ["jordan", "priya"], projectSlug: "swiftserve", commitsTogether: 14, prsReviewed: 5 },
  { pair: ["jordan", "sam"], projectSlug: "swiftserve", commitsTogether: 9, prsReviewed: 3 },
  { pair: ["priya", "sam"], projectSlug: "swiftserve", commitsTogether: 7, prsReviewed: 2 },
  { pair: ["jordan", "marcus"], projectSlug: "patchbot", commitsTogether: 6, prsReviewed: 4 },
  { pair: ["priya", "leo"], projectSlug: "flowviz", commitsTogether: 11, prsReviewed: 4 },
  { pair: ["priya", "yuki"], projectSlug: "flowviz", commitsTogether: 8, prsReviewed: 3 },
  { pair: ["leo", "yuki"], projectSlug: "flowviz", commitsTogether: 5, prsReviewed: 2 },
];

export interface SeedSlackThread {
  pair: [string, string];
  eventSlug: string;
  messageCount: number;
  sentiment: "positive" | "neutral" | "friction";
  summary: string;
}

export const SLACK_THREADS: SeedSlackThread[] = [
  { pair: ["jordan", "priya"], eventSlug: "cityhacks-spring", messageCount: 132, sentiment: "positive", summary: "Constant back-and-forth all weekend, finishing each other's sentences by hour 20, lots of inside jokes in #swiftserve-team." },
  { pair: ["jordan", "sam"], eventSlug: "cityhacks-spring", messageCount: 40, sentiment: "neutral", summary: "Mostly task-coordination messages, professional and to the point." },
  { pair: ["priya", "sam"], eventSlug: "cityhacks-spring", messageCount: 55, sentiment: "positive", summary: "Good collaborative energy on the demo script and UI polish." },
  { pair: ["jordan", "marcus"], eventSlug: "open-source-weekend", messageCount: 22, sentiment: "friction", summary: "Repeated disagreement over service architecture, thread got tense around hour 10." },
  { pair: ["priya", "leo"], eventSlug: "datajam", messageCount: 88, sentiment: "positive", summary: "Rapid iteration on the viz pipeline, mutual hype in #flowviz-team when the demo clicked." },
  { pair: ["priya", "yuki"], eventSlug: "datajam", messageCount: 61, sentiment: "positive", summary: "Deep technical discussion on the retrieval model, productive and warm." },
  { pair: ["leo", "yuki"], eventSlug: "datajam", messageCount: 34, sentiment: "neutral", summary: "Coordinated on dataset cleaning, mostly async status updates." },
];

export interface SeedRsvp {
  profileSlug: string;
  eventSlug: string;
}

export const UPCOMING_RSVPS: SeedRsvp[] = [
  { profileSlug: "priya", eventSlug: "ai-builders-sprint" },
  { profileSlug: "leo", eventSlug: "ai-builders-sprint" },
  { profileSlug: "nadia", eventSlug: "ai-builders-sprint" },
  { profileSlug: "marcus", eventSlug: "founders-weekend-hack" },
  { profileSlug: "devon", eventSlug: "founders-weekend-hack" },
  { profileSlug: "chris", eventSlug: "founders-weekend-hack" },
];

/** The profile the 90-second demo is driven from. */
export const DEMO_PROFILE_SLUG = "jordan";
