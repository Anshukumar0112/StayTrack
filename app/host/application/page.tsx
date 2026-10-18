"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { ClockIcon, LockIcon, CloseIcon, CheckIcon } from "@/components/ui/Icons";
import { submitHostApplication, getMyHostApplication } from "@/lib/api";
import { HostApplication } from "@/types/host";
import { useAuthGuard } from "@/hooks/useAuthGuard";

function formatSubmissionDate(value: any): string {
  if (!value) return "Recently";

  try {
    let date: Date;

    if (typeof value === "string" || typeof value === "number") {
      date = new Date(value);
    } else if (value && typeof value === "object") {
      if (value.seconds !== undefined) {
        date = new Date(value.seconds * 1000);
      } else if (value._seconds !== undefined) {
        date = new Date(value._seconds * 1000);
      } else if (typeof value.toDate === "function") {
        date = value.toDate();
      } else {
        date = new Date(value);
      }
    } else {
      date = new Date(value);
    }

    if (isNaN(date.getTime())) {
      return "Recently";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

export default function HostApplicationPage() {
  const { firebaseUser, userProfile, loading: authLoading, handleProtectedAction } = useAuthGuard();

  const [existingApp, setExistingApp] = useState<HostApplication | null>(null);
  const [fetchingApp, setFetchingApp] = useState(true);

  const [hostType, setHostType] = useState("property_owner");
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Redirect unauthenticated visitors to /auth?mode=login&redirect=/host/application
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/host/application", "host");
    }
  }, [authLoading, firebaseUser]);

  // Load existing application once authenticated
  const fetchApplication = async () => {
    if (!firebaseUser) return;
    setFetchingApp(true);
    try {
      const app = await getMyHostApplication();
      if (app && app.exists !== false && (app.id || (app as any).applicationId)) {
        setExistingApp(app);
      } else {
        setExistingApp(null);
      }
    } catch (err) {
      // Application not found is an expected state for new applicants
      setExistingApp(null);
    } finally {
      setFetchingApp(false);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      fetchApplication();
    } else if (!authLoading) {
      setFetchingApp(false);
    }
  }, [firebaseUser, authLoading]);

  // Pre-fill user profile fields
  useEffect(() => {
    if (userProfile) {
      setApplicantName(userProfile.name || "");
      setEmail(userProfile.email || "");
    }
  }, [userProfile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!applicantName.trim()) {
      setError("Full applicant name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await submitHostApplication({
        hostType,
        applicantName: applicantName.trim(),
        email: email.trim(),
      });

      setSuccessMessage("Host application submitted successfully!");
      await fetchApplication();
    } catch (err: any) {
      setError(err.message || "Failed to submit host application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = existingApp?.verificationStatus?.toLowerCase() || "";

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <Header />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12 w-full flex-1">
        <div className="mb-8 text-center">
          <span className="inline-block px-3.5 py-1 text-xs font-black uppercase tracking-wider bg-black text-white rounded-full shadow-sm">
            HOST VERIFICATION
          </span>
          <h1 className="text-3xl font-black text-zinc-950 mt-3">Become a Verified StayTrack Host</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Submit your owner application to unlock direct property listings
          </p>
        </div>

        {authLoading || fetchingApp ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">
            Loading host application details...
          </div>
        ) : existingApp && status === "pending" ? (
          /* STATUS: PENDING */
          <GlassCard className="border border-zinc-200 p-8 shadow-xl space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md animate-pulse">
              <ClockIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Status: Pending Review
              </span>
              <h2 className="text-2xl font-black text-zinc-950">Application Under Review</h2>
              <p className="text-xs text-zinc-500 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                Your host verification application has been received and is currently being reviewed by StayTrack administrators.
              </p>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-bold">Applicant:</span>
                <span className="font-bold text-zinc-900">{existingApp.applicantName || existingApp.fullName || "Applicant"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-bold">Host Type:</span>
                <span className="font-bold text-zinc-900 uppercase">{existingApp.hostType || "Property Owner"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-bold">Submitted:</span>
                <span className="font-bold text-zinc-900">
                  {formatSubmissionDate(existingApp.submittedAt)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-block rounded-xl bg-black px-6 py-3.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all shadow-sm"
              >
                ← Back to StayTrack
              </Link>
            </div>
          </GlassCard>
        ) : existingApp && status === "changes_required" ? (
          /* STATUS: CHANGES REQUIRED */
          <GlassCard className="border border-amber-200 bg-amber-50/30 p-8 shadow-xl space-y-6">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Changes Required
              </span>
              <h2 className="text-2xl font-black text-zinc-950">Application Update Requested</h2>
              <p className="text-xs text-zinc-600 font-medium mt-1">
                The verification staff reviewed your application and requested the following update:
              </p>
            </div>

            {existingApp.adminNote && (
              <div className="p-4 bg-white border border-amber-200 rounded-xl text-xs text-amber-950 font-semibold leading-relaxed">
                <span className="font-bold block text-amber-800 uppercase tracking-wider text-[10px] mb-1">Admin Note</span>
                {existingApp.adminNote}
              </div>
            )}

            {/* Resubmission Form */}
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Host Type *
                </label>
                <select
                  value={hostType}
                  onChange={(e) => setHostType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold outline-none focus:border-black"
                >
                  <option value="property_owner">Property Owner</option>
                  <option value="dealer_broker">Dealer / Broker</option>
                  <option value="hotel_owner">Hotel / Resort Owner</option>
                  <option value="pg_owner">PG / Co-Living Operator</option>
                  <option value="property_manager">Property Manager</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold outline-none focus:border-black"
                />
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <LockIcon className="w-4 h-4 text-zinc-700" />
                  <span>Identity Verification Policy</span>
                </div>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Government document verification will be completed during the verification process. Document upload will be available once secure document storage is enabled.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 shadow-md"
              >
                {submitting ? "Resubmitting Application..." : "Resubmit Application"}
              </button>
            </form>
          </GlassCard>
        ) : existingApp && status === "rejected" ? (
          /* STATUS: REJECTED */
          <GlassCard className="border border-red-200 p-8 shadow-xl space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md">
              <CloseIcon className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Status: Not Approved
              </span>
              <h2 className="text-2xl font-black text-zinc-950">Application Not Approved</h2>
              <p className="text-xs text-zinc-600 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                Unfortunately, your StayTrack host application was not approved during verification.
              </p>
            </div>

            {existingApp.rejectionReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-left text-xs text-red-950 font-semibold leading-relaxed">
                <span className="font-bold block text-red-800 uppercase tracking-wider text-[10px] mb-1">Rejection Reason</span>
                {existingApp.rejectionReason}
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/"
                className="inline-block rounded-xl bg-black px-6 py-3.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all shadow-sm"
              >
                ← Back to StayTrack
              </Link>
            </div>
          </GlassCard>
        ) : existingApp && status === "approved" ? (
          /* STATUS: APPROVED */
          <GlassCard className="border border-emerald-200 bg-emerald-50/20 p-8 shadow-xl space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <CheckIcon className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Verified StayTrack Host
              </span>
              <h2 className="text-2xl font-black text-zinc-950">You're Now a StayTrack Host</h2>
              <p className="text-xs text-zinc-600 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                Your host verification is complete. Activate your host subscription to list your properties and manage direct bookings.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <Link
                href="/host"
                className="rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs px-6 py-3.5 shadow-md transition-all"
              >
                Go to Host Dashboard →
              </Link>
            </div>
          </GlassCard>
        ) : (
          /* NEW APPLICATION FORM */
          <GlassCard className="border border-zinc-200 p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
                  {successMessage}
                </div>
              )}

              {/* Personal Information Section */}
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
                  1. Personal Information
                </h2>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full legal name"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-black outline-none focus:border-black"
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
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-black outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Host Type *
                    </label>
                    <select
                      value={hostType}
                      onChange={(e) => setHostType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-black outline-none focus:border-black"
                    >
                      <option value="property_owner">Property Owner</option>
                      <option value="dealer_broker">Dealer / Broker</option>
                      <option value="hotel_owner">Hotel / Resort Owner</option>
                      <option value="pg_owner">PG / Co-Living Operator</option>
                      <option value="property_manager">Property Manager</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Identity Verification Section */}
              <div className="space-y-3 pt-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
                  2. Identity Verification
                </h2>

                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                    <LockIcon className="w-4 h-4 text-zinc-700" />
                    <span>Identity Verification Policy</span>
                  </div>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Government document verification will be completed during the verification process. Document upload will be available once secure document storage is enabled.
                  </p>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Submitting Host Application..." : "Submit Host Application"}
                </button>
              </div>
            </form>
          </GlassCard>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
