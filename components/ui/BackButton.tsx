"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "./Icons";

export interface BackButtonProps {
  /**
   * Safe fallback URL when browser history is not available or relevant
   */
  fallbackUrl: string;
  /**
   * Visible label next to arrow. Defaults to "Back"
   */
  label?: string;
  /**
   * Screen-reader / aria label. Defaults to "Go back"
   */
  ariaLabel?: string;
  /**
   * Additional CSS classes for styling / alignment
   */
  className?: string;
  /**
   * Whether to display the text label alongside the icon. Defaults to true
   */
  showText?: boolean;
}

/**
 * Determines whether browser history can be safely used to return to a previous StayTrack page.
 * Returns false if:
 * 1. History length <= 1 (opened in a new tab or single session page)
 * 2. Next.js history state idx <= 0 (initial route entry)
 * 3. document.referrer is from a foreign origin (would navigate out of StayTrack to an external site)
 */
export function canUseBrowserHistory(): boolean {
  if (typeof window === "undefined") return false;

  // 1. History length of 1 means this is the very first page opened in this tab
  if (window.history.length <= 1) return false;

  // 2. Next.js App Router tracks navigation depth in window.history.state.idx
  const stateIdx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof stateIdx === "number" && stateIdx <= 0) {
    return false;
  }

  // 3. Prevent navigating back out to an external referrer (e.g. search engines, external links)
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.origin !== window.location.origin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export default function BackButton({
  fallbackUrl,
  label = "Back",
  ariaLabel = "Go back",
  className = "",
  showText = true,
}: BackButtonProps) {
  const router = useRouter();
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending timer on unmount
  useEffect(() => {
    return () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
    };
  }, []);

  const getEffectiveFallback = useCallback(() => {
    // If the fallback is the properties catalog, check if user had a recent filtered search in this session
    if (fallbackUrl === "/properties" && typeof window !== "undefined") {
      try {
        const lastSearch = sessionStorage.getItem("staytrack_last_search");
        if (lastSearch && lastSearch.startsWith("/properties")) {
          return lastSearch;
        }
      } catch {
        // Safe fallback
      }
    }
    return fallbackUrl;
  }, [fallbackUrl]);

  const handleBack = () => {
    const targetFallback = getEffectiveFallback();

    // If browser history is not available or relevant, immediately push safe fallback
    if (!canUseBrowserHistory()) {
      router.push(targetFallback);
      return;
    }

    // Capture starting URL to detect if history popstate navigation successfully moves
    const startHref = typeof window !== "undefined" ? window.location.href : "";

    // Clear any previous watchdog
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
    }

    // Trigger router.back()
    router.back();

    // Watchdog fallback: if URL hasn't changed after 250ms, push fallback route
    watchdogTimerRef.current = setTimeout(() => {
      if (typeof window !== "undefined" && window.location.href === startHref) {
        router.push(targetFallback);
      }
    }, 250);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-muted hover:text-foreground hover:border-foreground/30 text-xs font-medium transition-colors cursor-pointer shadow-2xs focus-ring ${className}`}
    >
      <ArrowLeftIcon className="w-3.5 h-3.5" />
      {showText && <span>{label}</span>}
    </button>
  );
}
