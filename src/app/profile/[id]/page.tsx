"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useProfiles } from "@/components/ProfileContext";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Profile } from "@/lib/domain/types";

interface Connection {
  profileId: string;
  name: string;
  score: number;
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profiles } = useProfiles();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/profiles/${id}`);
    const json = await res.json();
    setProfile(json.profile ?? null);
    setConnections(json.connections ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, setState happens inside load()
    load();
  }, [load]);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{profile.name}</h1>
            <p className="text-sm text-neutral-500">{profile.qualification}</p>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <div>Level {profile.experienceLevel}/5</div>
            <div>
              {profile.eventsAttended} events · {profile.hackathonsWon} wins
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{profile.bio}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.interests.map((i) => (
            <span key={i} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {i}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 font-semibold">Chemistry connections</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-neutral-400">No chemistry data yet.</p>
        ) : (
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.profileId} className="flex items-center justify-between rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800">
                <span>{c.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                    <div className="h-full bg-blue-600" style={{ width: `${c.score}%` }} />
                  </div>
                  <span className="w-8 text-right text-neutral-500">{c.score}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FeedbackForm profile={profile} allProfiles={profiles} onSubmitted={load} />
    </div>
  );
}
