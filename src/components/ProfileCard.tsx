"use client";

import { useProfiles } from "./ProfileContext";

export function ProfileCard() {
  const { activeProfile, loading } = useProfiles();

  if (loading || !activeProfile) {
    return <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">Loading...</div>;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{activeProfile.name}</h1>
          <p className="text-sm text-neutral-500">{activeProfile.qualification}</p>
        </div>
        <div className="text-right text-sm text-neutral-500">
          <div>Level {activeProfile.experienceLevel}/5</div>
          <div>
            {activeProfile.eventsAttended} events · {activeProfile.hackathonsWon} wins
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{activeProfile.bio}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {activeProfile.interests.map((i) => (
          <span
            key={i}
            className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
