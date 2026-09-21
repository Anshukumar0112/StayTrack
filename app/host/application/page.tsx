"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import { submitHostApplication, getMyHostApplication } from "@/lib/api";
import { HostApplication } from "@/types/host";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";

export default function HostApplicationPage() {
  const { user: userProfile } = useUser();
  const [existingApp, setExistingApp] = useState<HostApplication | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [govIdUrl, setGovIdUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchApplication = () => {
    setLoading(true);
    getMyHostApplication()
      .then((app) => {
        if (app && app.id) setExistingApp(app);
        else setExistingApp(null);
      })
      .catch((err) => console.warn("Failed to fetch host app:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplication();
  }, []);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || "");
      setEmail(userProfile.email || "");
      setPhone(userProfile.phone || "");
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !phone) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await submitHostApplication({
        fullName,
        email,
        phone,
        govIdUrl,
      });
      alert("Host application submitted successfully! Admin will review your profile. 🎉");
      fetchApplication();
    } catch (err: any) {
      setError(err.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8 text-center">
          <span className="clay-badge px-3.5 py-1 text-xs font-extrabold uppercase">
            HOST VERIFICATION
          </span>
          <h1 className="text-3xl font-black text-zinc-950 mt-3">Become a Verified StayTrack Host</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Submit your owner application to unlock direct property listings with ₹0 brokerage
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">
            Checking application status...
          </div>
        ) : existingApp ? (
          <GlassCard className="border border-zinc-200 p-8 shadow-xl space-y-6">
            <div className="text-center pb-6 border-b border-zinc-200">
              <span className={`clay-badge px-4 py-1.5 text-xs font-extrabold uppercase ${
                existingApp.verificationStatus === "approved"
                  ? "bg-emerald-600 text-white"
                  : existingApp.verificationStatus === "rejected"
                  ? "bg-red-600 text-white"
                  : "bg-amber-500 text-white animate-pulse"
              }`}>
                STATUS: {existingApp.verificationStatus}
              </span>

              <h2 className="text-2xl font-black text-zinc-950 mt-4">
                {existingApp.verificationStatus === "approved"
                  ? "Congratulations! You are a Verified Host"
                  : existingApp.verificationStatus === "rejected"
                  ? "Application Requires Revision"
                  : "Application Under Admin Review"}
              </h2>

              <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
                {existingApp.verificationStatus === "approved"
                  ? "Your host profile has been approved. You can now list properties and receive bookings."
                  : existingApp.verificationStatus === "rejected"
                  ? `Reason: ${existingApp.rejectionReason || "Verification failed. Please contact admin."}`
                  : "Our team is verifying your details. Reviews are usually completed within 24 hours."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-zinc-700">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Applicant Name</span>
                <span className="font-bold text-zinc-950">{existingApp.fullName}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Email</span>
                <span className="font-bold text-zinc-950">{existingApp.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Phone</span>
                <span className="font-bold text-zinc-950">{existingApp.phone}</span>
              </div>
            </div>

            {existingApp.verificationStatus === "approved" && (
              <div className="pt-4 flex justify-center">
                <Link
                  href="/host"
                  className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-6 py-3.5 shadow-md"
                >
                  Go to Host Dashboard →
                </Link>
              </div>
            )}
          </GlassCard>
        ) : (
          <GlassCard className="border border-zinc-200 p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter your full legal name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Govt ID Document Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://storage.../Aadhaar_PAN_Verification.pdf"
                  value={govIdUrl}
                  onChange={(e) => setGovIdUrl(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Submitting Application..." : "Submit Host Application"}
              </button>
            </form>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
