"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import { useUser } from "@/hooks/useUser";
import { updateCurrentUser } from "@/lib/api";

export default function ProfilePage() {
  const { user, loading } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async () => {
    setMessage("");
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Full name must not exceed 100 characters.");
      return;
    }

    if (trimmedEmail && trimmedEmail.length > 254) {
      setError("Email address must not exceed 254 characters.");
      return;
    }

    setSaving(true);

    try {
      const updatedUser = await updateCurrentUser({
        name: trimmedName,
        email: trimmedEmail,
      });

      setName(updatedUser.name || "");
      setEmail(updatedUser.email || "");
      setMessage("Profile updated successfully.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to update profile.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">User Profile</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Manage personal contact details and role preferences
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm font-semibold text-zinc-500">
            Loading profile...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* User Badge Card */}
            <div className="md:col-span-1">
              <ClayCard className="text-center p-6 border border-zinc-200">
                <div className="mx-auto h-20 w-20 rounded-full bg-black text-white flex items-center justify-center text-2xl font-black shadow-md mb-4">
                  {user?.phone ? user.phone.slice(-2) : "ST"}
                </div>

                <h3 className="text-base font-bold text-zinc-950">
                  {name || "StayTrack Member"}
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  {user?.phone || "No phone connected"}
                </p>

                <div className="mt-4 inline-block clay-badge px-3 py-1 text-[11px] font-extrabold">
                  Role: {user?.role || "customer"}
                </div>
              </ClayCard>
            </div>

            {/* User Details Form */}
            <div className="md:col-span-2">
              <GlassCard className="border border-zinc-200 space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider pb-3 border-b border-zinc-200">
                  Personal Information
                </h3>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your full name"
                    maxLength={100}
                    disabled={saving}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    maxLength={254}
                    disabled={saving}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Phone Number (Verified)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.phone || ""}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold opacity-60 cursor-not-allowed"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="glass-button w-full py-3 rounded-xl text-xs font-bold mt-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Profile Changes"}
                </button>
              </GlassCard>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
