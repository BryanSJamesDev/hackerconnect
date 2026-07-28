"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfiles } from "@/components/ProfileContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh, setActiveProfileId } = useProfiles();
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [interests, setInterests] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        qualification,
        interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
        bio,
      }),
    });
    const json = await res.json();
    await refresh();
    if (json.profile) setActiveProfileId(json.profile.id);
    setSubmitting(false);
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Create your profile</h1>
      <p className="mb-6 text-sm text-neutral-500">
        This seeds your starting profile. Chemistry with other builders grows from what you actually
        collaborate on and how events go — this form is just the cold start.
      </p>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="block text-sm">
          Name
          <input required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          Qualification / background
          <input required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. BS Computer Science" />
        </label>
        <label className="block text-sm">
          Interests (comma-separated)
          <input required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="ai, backend, design" />
        </label>
        <label className="block text-sm">
          Short bio
          <textarea className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <button type="submit" disabled={submitting} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
          {submitting ? "Creating..." : "Create profile"}
        </button>
      </form>
    </div>
  );
}
