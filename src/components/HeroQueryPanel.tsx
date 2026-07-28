"use client";

import { useState } from "react";
import { useProfiles } from "./ProfileContext";
import { SLUG_BY_NAME } from "@/lib/synthetic/lookup";
import type { ConnectorType, HeroQueryResult } from "@/lib/domain/types";

const CONNECTORS: ConnectorType[] = ["github", "slack", "linear", "gmail"];

async function runQuery(profileSlug: string, scopeToConnector?: ConnectorType): Promise<HeroQueryResult> {
  const res = await fetch("/api/hero-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileSlug, scopeToConnector }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Query failed");
  return res.json();
}

function ResultCard({ result, label }: { result: HeroQueryResult; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-500">{label}</h3>
        <div className="flex gap-1">
          {result.sourcesUsed.length === 0 ? (
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
              no sources
            </span>
          ) : (
            result.sourcesUsed.map((s) => (
              <span
                key={s}
                className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {s}
              </span>
            ))
          )}
        </div>
      </div>

      {result.degraded && (
        <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <strong>Degraded:</strong> {result.degradedNote}
        </div>
      )}

      <div className="mb-4">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Next event</div>
        {result.nextEvent ? (
          <div>
            <div className="font-medium">
              {result.nextEvent.eventName} <span className="text-neutral-500">· {result.nextEvent.eventDate}</span>
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{result.nextEvent.rationale}</div>
          </div>
        ) : (
          <div className="text-sm text-neutral-400">No event suggestion.</div>
        )}
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Suggested teammates</div>
        {result.teammates.length === 0 ? (
          <div className="text-sm text-neutral-400">No teammates ranked.</div>
        ) : (
          <ul className="space-y-2">
            {result.teammates.map((t) => (
              <li key={t.candidateId} className="rounded-md bg-neutral-100 p-2 text-sm dark:bg-neutral-900">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.candidateName}</span>
                  <span className="text-neutral-500">{t.chemistryScore}/100</span>
                </div>
                <div className="text-neutral-600 dark:text-neutral-400">{t.rationale}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function HeroQueryPanel() {
  const { activeProfile } = useProfiles();
  const [fullResult, setFullResult] = useState<HeroQueryResult | null>(null);
  const [scopedResult, setScopedResult] = useState<HeroQueryResult | null>(null);
  const [scope, setScope] = useState<ConnectorType>("gmail");
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingScoped, setLoadingScoped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = activeProfile ? SLUG_BY_NAME[activeProfile.name] : null;

  async function askFull() {
    if (!slug) return;
    setError(null);
    setLoadingFull(true);
    try {
      setFullResult(await runQuery(slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingFull(false);
    }
  }

  async function askScoped() {
    if (!slug) return;
    setError(null);
    setLoadingScoped(true);
    try {
      setScopedResult(await runQuery(slug, scope));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingScoped(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold">What&apos;s my next event, and who should I team with?</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Answered live from HydraDB (GitHub + Slack + Linear + Gmail), scored deterministically, and written up by
        a Groq-hosted model running inside a RocketRide-managed pipeline.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={askFull}
          disabled={!slug || loadingFull}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loadingFull ? "Asking..." : "Ask (all sources)"}
        </button>

        <div className="flex items-center gap-2 border-l border-neutral-200 pl-3 dark:border-neutral-800">
          <span className="text-sm text-neutral-500">Kill shot — scope to:</span>
          <select
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={scope}
            onChange={(e) => setScope(e.target.value as ConnectorType)}
          >
            {CONNECTORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={askScoped}
            disabled={!slug || loadingScoped}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            {loadingScoped ? "Asking..." : "Re-run scoped"}
          </button>
        </div>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {(fullResult || scopedResult) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {fullResult && <ResultCard result={fullResult} label="Full answer (all 4 connectors)" />}
          {scopedResult && <ResultCard result={scopedResult} label={`Scoped to ${scope} only`} />}
        </div>
      )}
    </div>
  );
}
