"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "./useAuth";
import { User } from "@/lib/types";
import { getCurrentUser } from "@/lib/api";

const STORAGE_KEY = "staytrack_user_profile";

interface CacheEntry {
  uid: string;
  profile: User;
}

let memoryCache: CacheEntry | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function readStorageProfile(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function cacheUserProfile(profile: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile && profile.uid) {
      if (
        memoryCache?.uid === profile.uid &&
        memoryCache.profile.role === profile.role &&
        memoryCache.profile.name === profile.name &&
        memoryCache.profile.phone === profile.phone &&
        memoryCache.profile.email === profile.email
      ) {
        return;
      }
      memoryCache = { uid: profile.uid, profile };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      if (!memoryCache && !sessionStorage.getItem(STORAGE_KEY)) {
        return;
      }
      memoryCache = null;
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  notifyListeners();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getClientSnapshot(): User | null {
  if (!memoryCache) {
    const stored = readStorageProfile();
    if (stored) {
      memoryCache = { uid: stored.uid, profile: stored };
    }
  }
  return memoryCache ? memoryCache.profile : null;
}

function getServerSnapshot(): User | null {
  return null;
}

export function useUser() {
  const { user: firebaseUser, loading: authLoading } = useAuth();

  const user = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const [networkLoading, setNetworkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async (force: boolean = false) => {
    if (!firebaseUser) {
      cacheUserProfile(null);
      setError(null);
      return;
    }

    try {
      setNetworkLoading(true);
      setError(null);
      const token = await firebaseUser.getIdToken(force);
      const profile = await getCurrentUser(token);
      if (profile) {
        cacheUserProfile(profile);
      } else if (!user) {
        setError("Unable to sync profile with server.");
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      if (!user) {
        setError(err?.message || "Failed to load user profile.");
      }
    } finally {
      setNetworkLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (firebaseUser) {
        fetchUser();
      } else {
        cacheUserProfile(null);
        setError(null);
      }
    }
  }, [firebaseUser, authLoading]);

  return {
    user,
    loading: authLoading || networkLoading,
    error,
    refetch: () => fetchUser(true),
  };
}
