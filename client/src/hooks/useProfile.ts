import { useEffect, useState } from "react";

export interface ManualProfile {
  archetype: string;
  values: string[];
  beliefs: string[];
}

const PROFILE_STORAGE_KEY = "axiomer_global_profile_lists";

const DEFAULT_PROFILE: ManualProfile = {
  archetype: "Unknown",
  values: [],
  beliefs: [],
};

function loadProfile(): ManualProfile {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load manual profile", err);
  }
  return DEFAULT_PROFILE;
}

export function useProfile() {
  const [profile, setProfile] = useState<ManualProfile>(loadProfile());

  useEffect(() => {
    const handleSync = () => setProfile(loadProfile());
    window.addEventListener("profile_updated", handleSync);
    return () => window.removeEventListener("profile_updated", handleSync);
  }, []);

  // Helper to ensure we always update the latest localStorage state 
  // and sync it to all other hook instances immediately
  const updateProfile = (updater: (prev: ManualProfile) => ManualProfile) => {
    const current = loadProfile();
    const next = updater(current);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("profile_updated"));
  };

  const updateArchetype = (archetype: string) => {
    updateProfile((prev) => ({ ...prev, archetype }));
  };

  const addValue = (value: string) => {
    if (!value.trim()) return;
    updateProfile((prev) => ({ ...prev, values: [...prev.values, value.trim()] }));
  };

  const removeValue = (index: number) => {
    updateProfile((prev) => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }));
  };

  const addBelief = (belief: string) => {
    if (!belief.trim()) return;
    updateProfile((prev) => ({ ...prev, beliefs: [...prev.beliefs, belief.trim()] }));
  };

  const removeBelief = (index: number) => {
    updateProfile((prev) => ({
      ...prev,
      beliefs: prev.beliefs.filter((_, i) => i !== index),
    }));
  };

  return {
    profile,
    updateArchetype,
    addValue,
    removeValue,
    addBelief,
    removeBelief,
  };
}
