export type ConnectorType = "slack" | "github" | "linear" | "gmail";

export interface Profile {
  id: string;
  name: string;
  qualification: string;
  interests: string[];
  bio: string;
  experienceLevel: number; // 1-5, derived from events attended + chemistry
  eventsAttended: number;
  hackathonsWon: number;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  name: string;
  date: string;
  location: string;
  discoveredVia: "gmail";
  attendeeIds: string[];
}

export interface ProjectRecord {
  id: string;
  eventId: string;
  name: string;
  memberIds: string[];
  won: boolean;
}

export interface ChemistrySignals {
  githubCollabs: number;
  slackInteractions: number;
  eventsAttendedTogether: number;
  hackathonsWonTogether: number;
}

export interface ChemistryEdge {
  userA: string;
  userB: string;
  score: number; // 0-100 deterministic base score
  signals: ChemistrySignals;
  lastUpdated: string;
}

export interface EventFeedback {
  id: string;
  eventId: string;
  profileId: string;
  teammateId: string;
  outcome: "won" | "fun" | "neutral" | "friction";
  note?: string;
  createdAt: string;
}

export interface TeammateSuggestion {
  candidateId: string;
  candidateName: string;
  chemistryScore: number;
  rationale: string;
}

export interface EventSuggestion {
  eventId: string;
  eventName: string;
  eventDate: string;
  connectionsGoing: { profileId: string; name: string; chemistryScore: number }[];
  rationale: string;
}

export interface HeroQueryResult {
  nextEvent: EventSuggestion | null;
  teammates: TeammateSuggestion[];
  sourcesUsed: ConnectorType[];
  degraded: boolean;
  degradedNote: string | null;
}
