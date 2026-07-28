import { queryContext, type HydraChunk } from "@/lib/hydradb/client";
import { runRationaleAgent } from "@/lib/rocketride/client";
import { NAME_BY_SLUG } from "@/lib/synthetic/lookup";
import { baseChemistryScore } from "@/lib/chemistry/scoring";
import type { ChemistrySignals, ConnectorType, HeroQueryResult } from "@/lib/domain/types";

const COLLECTION = "hackerconnect";

function chunkText(chunk: HydraChunk): string {
  try {
    const parsed = JSON.parse(chunk.chunk_content);
    return parsed?.content?.text ?? chunk.chunk_content;
  } catch {
    return chunk.chunk_content;
  }
}

interface CandidateEvidence {
  slug: string;
  signals: ChemistrySignals;
  evidenceLines: string[];
}

/**
 * Deterministically builds each candidate's chemistry signals from
 * structured metadata on the retrieved HydraDB chunks (github/slack/linear
 * only — gmail co-attendance never counts as chemistry). This is the join:
 * scoping the query away from these connectors makes this map empty, which
 * is exactly the "kill shot" degrade behavior the demo needs.
 */
function buildCandidateEvidence(chunks: HydraChunk[], selfSlug: string): Map<string, CandidateEvidence> {
  const byCandidate = new Map<string, CandidateEvidence>();
  const get = (slug: string) => {
    if (!byCandidate.has(slug)) {
      byCandidate.set(slug, {
        slug,
        signals: { githubCollabs: 0, slackInteractions: 0, eventsAttendedTogether: 0, hackathonsWonTogether: 0 },
        evidenceLines: [],
      });
    }
    return byCandidate.get(slug)!;
  };

  for (const chunk of chunks) {
    const connector = chunk.metadata?.connector as ConnectorType | undefined;
    if (connector !== "github" && connector !== "slack" && connector !== "linear") continue;

    const slugs = ((chunk.metadata?.profile_slugs as string | undefined) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!slugs.includes(selfSlug)) continue;
    const others = slugs.filter((s) => s !== selfSlug);
    if (others.length === 0) continue;

    const text = chunkText(chunk);
    for (const otherSlug of others) {
      const candidate = get(otherSlug);
      candidate.evidenceLines.push(`[${connector}] ${text}`);

      if (connector === "github") {
        candidate.signals.githubCollabs += Number(chunk.metadata?.commits_together ?? 0);
      } else if (connector === "slack") {
        candidate.signals.slackInteractions += Number(chunk.metadata?.message_count ?? 0);
      } else if (connector === "linear") {
        candidate.signals.eventsAttendedTogether += 1;
        if (chunk.metadata?.won === true) candidate.signals.hackathonsWonTogether += 1;
      }
    }
  }

  return byCandidate;
}

interface GmailEventInfo {
  slug: string;
  name: string;
  date: string;
  attendeeSlugs: Set<string>;
  evidenceLines: string[];
}

function buildEventInfo(chunks: HydraChunk[]): Map<string, GmailEventInfo> {
  const events = new Map<string, GmailEventInfo>();
  const get = (slug: string, name: string) => {
    if (!events.has(slug)) {
      events.set(slug, { slug, name, date: "", attendeeSlugs: new Set(), evidenceLines: [] });
    }
    return events.get(slug)!;
  };

  for (const chunk of chunks) {
    if ((chunk.metadata?.connector as ConnectorType | undefined) !== "gmail") continue;
    const eventSlug = chunk.metadata?.event_slug as string | undefined;
    const eventName = chunk.metadata?.event_name as string | undefined;
    if (!eventSlug || !eventName) continue;

    const info = get(eventSlug, eventName);
    const text = chunkText(chunk);
    info.evidenceLines.push(`[gmail] ${text}`);
    const profileSlug = chunk.metadata?.profile_slug as string | undefined;
    if (profileSlug) info.attendeeSlugs.add(profileSlug);
    const dateMatch = text.match(/Date: (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) info.date = dateMatch[1];
  }

  return events;
}

interface RationaleOutput {
  teammateRationales: { slug: string; rationale: string }[];
  eventRationale: string | null;
  degradedNote: string | null;
}

const SYSTEM_PROMPT = `You are the HackerConnect matching agent's writing layer. You are NEVER asked to
decide who is a good match, compute scores, or pick an event — that has already been decided by
deterministic code using retrieved evidence. Your only job is to turn the structured facts you're given
into short, natural, specific rationale sentences (1 sentence each), grounded strictly in the evidence
lines provided. Do not invent numbers or facts not present in the evidence.
Respond ONLY with strict JSON matching this shape:
{"teammateRationales": [{"slug": string, "rationale": string}], "eventRationale": string | null,
 "degradedNote": string | null}`;

export async function runHeroQuery(
  profileSlug: string,
  opts?: { scopeToConnector?: ConnectorType }
): Promise<HeroQueryResult> {
  const profileName = NAME_BY_SLUG[profileSlug];
  if (!profileName) throw new Error(`Unknown profile slug: ${profileSlug}`);

  const scope = opts?.scopeToConnector;

  // Stage 1: chemistry evidence — all connectors unless kill-shot scoped to one.
  const stage1 = await queryContext({
    collection: COLLECTION,
    query: `${profileName} hackathon teammates collaboration chemistry history wins`,
    scopeToConnector: scope,
    maxResults: 25,
  });

  const candidateMap = buildCandidateEvidence(stage1.chunks, profileSlug);
  const candidates = [...candidateMap.values()]
    .map((c) => ({ ...c, score: baseChemistryScore(c.signals) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Stage 2: event discovery is always Gmail-scoped in full mode (that's genuinely the
  // only connector event data lives in) but forced to the kill-shot connector when set,
  // so a non-Gmail kill shot loses event discovery entirely too.
  const stage2Scope = scope ?? "gmail";
  const candidateNames = candidates.map((c) => NAME_BY_SLUG[c.slug]).filter(Boolean);
  const stage2 = await queryContext({
    collection: COLLECTION,
    query:
      candidateNames.length > 0
        ? `${candidateNames.join(", ")} upcoming event RSVP invite`
        : `${profileName} upcoming event RSVP invite`,
    scopeToConnector: stage2Scope,
    maxResults: 20,
  });

  const eventMap = buildEventInfo(stage2.chunks);

  let bestEvent: (GmailEventInfo & { overlap: { slug: string; score: number }[] }) | null = null;
  for (const event of eventMap.values()) {
    if (event.attendeeSlugs.has(profileSlug)) continue; // already attending
    const overlap = candidates
      .filter((c) => event.attendeeSlugs.has(c.slug))
      .map((c) => ({ slug: c.slug, score: c.score }));
    if (overlap.length === 0) continue;
    if (!bestEvent || overlap.length > bestEvent.overlap.length) {
      bestEvent = { ...event, overlap };
    }
  }

  const degraded = candidates.length === 0;

  // Ask Groq for rationale prose only — never for decisions.
  const rationaleInput = {
    profile: profileName,
    degraded,
    candidates: candidates.map((c) => ({
      slug: c.slug,
      name: NAME_BY_SLUG[c.slug],
      score: c.score,
      evidence: c.evidenceLines,
    })),
    bestEvent: bestEvent
      ? {
          name: bestEvent.name,
          overlap: bestEvent.overlap.map((o) => NAME_BY_SLUG[o.slug]),
          evidence: bestEvent.evidenceLines,
        }
      : null,
    scopedToSingleSource: scope ?? null,
  };

  const rationale = await runRationaleAgent<RationaleOutput>(
    SYSTEM_PROMPT,
    JSON.stringify(rationaleInput, null, 2)
  );

  const rationaleBySlug = new Map(rationale.teammateRationales.map((r) => [r.slug, r.rationale]));

  const sourcesUsed = new Set<ConnectorType>();
  for (const c of [...stage1.chunks, ...stage2.chunks]) {
    const connector = c.metadata?.connector as ConnectorType | undefined;
    if (connector) sourcesUsed.add(connector);
  }

  return {
    nextEvent: bestEvent
      ? {
          eventId: bestEvent.slug,
          eventName: bestEvent.name,
          eventDate: bestEvent.date,
          connectionsGoing: bestEvent.overlap.map((o) => ({
            profileId: o.slug,
            name: NAME_BY_SLUG[o.slug],
            chemistryScore: o.score,
          })),
          rationale: rationale.eventRationale ?? `${bestEvent.overlap.map((o) => NAME_BY_SLUG[o.slug]).join(", ")} confirmed attending.`,
        }
      : null,
    teammates: candidates.map((c) => ({
      candidateId: c.slug,
      candidateName: NAME_BY_SLUG[c.slug],
      chemistryScore: c.score,
      rationale: rationaleBySlug.get(c.slug) ?? "No rationale generated.",
    })),
    sourcesUsed: [...sourcesUsed],
    degraded,
    degradedNote: degraded
      ? `No GitHub, Slack, or Linear evidence was retrieved${scope ? ` (query scoped to ${scope} only)` : ""}, so chemistry could not be computed${!bestEvent ? " and no event could be tied to a high-chemistry connection" : ""}.`
      : null,
  };
}
