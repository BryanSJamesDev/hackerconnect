"use client";

import { useProfiles } from "./ProfileContext";
import Link from "next/link";

export function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfileId, loading } = useProfiles();

  if (loading) return <div className="text-sm text-neutral-500">Loading profiles...</div>;

  return (
    <div className="flex items-center gap-3">
      <select
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        value={activeProfile?.id ?? ""}
        onChange={(e) => setActiveProfileId(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {activeProfile && (
        <Link
          href={`/profile/${activeProfile.id}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View profile
        </Link>
      )}
    </div>
  );
}
