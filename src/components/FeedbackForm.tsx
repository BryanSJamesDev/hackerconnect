"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/domain/types";

interface EventSummary {
  id: string;
  name: string;
  eventDate: string;
}

export function FeedbackForm({ profile, allProfiles, onSubmitted }: { profile: Profile; allProfiles: Profile[]; onSubmitted: () => void }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [teammateId, setTeammateId] = useState("");
  const [outcome, setOutcome] = useState<"won" | "fun" | "neutral" | "friction">("fun");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const others = allProfiles.filter((p) => p.id !== profile.id);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((json) => {
        setEvents(json.events ?? []);
        if (json.events?.[0]) setEventId(json.events[0].id);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- defaulting the teammate select once profiles load
    if (others[0] && !teammateId) setTeammateId(others[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProfiles]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, profileId: profile.id, teammateId, outcome, note }),
    });
    setSubmitting(false);
    setDone(true);
    onSubmitted();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="font-semibold">Post-event feedback</h3>
      <p className="text-sm text-neutral-500">
        Tweaks the chemistry score between you and a teammate — a win adds the most, friction subtracts.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Event
          <select className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-950" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Teammate
          <select className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-950" value={teammateId} onChange={(e) => setTeammateId(e.target.value)}>
            {others.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Outcome
        <div className="mt-1 flex gap-2">
          {(["won", "fun", "neutral", "friction"] as const).map((o) => (
            <button
              type="button"
              key={o}
              onClick={() => setOutcome(o)}
              className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                outcome === o
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </label>

      <label className="block text-sm">
        Note (optional)
        <textarea className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-950" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </label>

      <button type="submit" disabled={submitting || !eventId || !teammateId} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
        {submitting ? "Saving..." : "Submit feedback"}
      </button>
      {done && <span className="ml-3 text-sm text-green-600">Chemistry updated.</span>}
    </form>
  );
}
