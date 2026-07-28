"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Profile } from "@/lib/domain/types";

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfileId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY = "hackerconnect:activeProfileId";

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/profiles");
    const json = await res.json();
    setProfiles(json.profiles ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, setState happens inside refresh()
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (profiles.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const validStored = stored && profiles.some((p) => p.id === stored) ? stored : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing selection to the freshly-loaded profile list
    setActiveProfileIdState(validStored ?? profiles[0].id);
  }, [profiles]);

  const setActiveProfileId = useCallback((id: string) => {
    setActiveProfileIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, setActiveProfileId, loading, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used within ProfileProvider");
  return ctx;
}
