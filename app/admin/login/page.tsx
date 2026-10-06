"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { signInWithGoogle, getIdToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTarget = searchParams.get("returnTo") || "/admin";
  const errorParam = searchParams.get("error");

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (errorParam === "unauthorized") {
      setError("Access denied. Admin session required to view this page.");
    }
  }, [errorParam]);

  async function handleAdminSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!adminId.trim() || !password) {
      setError("Please enter your Admin ID and Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: adminId.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== "undefined" && data.adminToken) {
          sessionStorage.setItem("staytrack_admin_token", data.adminToken);
        }
        setMessage("Admin authenticated successfully! Redirecting to command console...");
        setTimeout(() => {
          window.location.href = returnTarget.startsWith("/admin") ? returnTarget : "/admin";
        }, 500);
      } else {
        setError(data.error || "Invalid Admin ID or Password. Access denied.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Admin server authentication failed.");
      setLoading(false);
    }
  }

  async function handleGoogleAdminSignIn() {
    setError("");
    setMessage("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      await processAdminAuthRedirection();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
      setGoogleLoading(false);
    }
  }

  async function processAdminAuthRedirection() {
    setMessage("Verifying administrator credentials & role...");
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Unable to retrieve authentication token.");
      }

      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isGoogleAuth: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== "undefined" && data.adminToken) {
          sessionStorage.setItem("staytrack_admin_token", data.adminToken);
        }
        setMessage("Administrator verified! Redirecting to command console...");
        setTimeout(() => {
          window.location.href = returnTarget.startsWith("/admin") ? returnTarget : "/admin";
        }, 500);
      } else {
        setError(data.error || "Access Denied: This account is not registered as an Admin in StayTrack.");
        setLoading(false);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Admin role verification failed.");
      setLoading(false);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16 w-full flex-1 flex items-center justify-center">
      <GlassCard className="p-8 border border-zinc-200 bg-white/95 backdrop-blur-md shadow-2xl w-full relative rounded-3xl">
        {/* Header Badge & Title */}
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-full mb-3 shadow-xs">
            ADMIN SECURITY GATEWAY
          </span>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white text-2xl font-black shadow-md">
          </div>
          <h1 className="text-2xl font-black text-zinc-950 mt-3">Admin Portal Login</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Authorized StayTrack platform administrators only
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center leading-relaxed">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center leading-relaxed">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAdminSignIn} className="space-y-4">
          <div>
            <label htmlFor="admin-id" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Admin ID *
            </label>
            <input
              id="admin-id"
              type="text"
              required
              placeholder="Enter Admin ID"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              disabled={loading || googleLoading}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-zinc-50 text-xs font-semibold text-zinc-900 outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Admin Password *
            </label>
            <input
              id="admin-password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || googleLoading}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-zinc-50 text-xs font-semibold text-zinc-900 outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-4 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md"
          >
            {loading ? "Authenticating Admin..." : "Sign In to Admin Console"}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-zinc-200" />
          <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            OR ADMIN SSO
          </span>
        </div>

        {/* Google Admin SSO */}
        <button
          type="button"
          onClick={handleGoogleAdminSignIn}
          disabled={loading || googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{googleLoading ? "Signing in..." : "Sign In with Admin Google Account"}</span>
        </button>

        <div className="mt-6 text-center text-xs text-zinc-500 pt-4 border-t border-zinc-100">
          <Link href="/" className="font-bold text-zinc-700 hover:text-black transition">
            ← Return to Public StayTrack Site
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-16 text-xs font-bold text-zinc-500">
          Loading Admin Gateway...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
