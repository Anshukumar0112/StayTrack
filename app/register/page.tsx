"use client";

import { FormEvent, useState, Suspense } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import { sendOtp, verifyOtp, resetRecaptcha } from "@/lib/auth";
import { updateCurrentUser } from "@/lib/api";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "host">("customer");

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const cleaned = phone.replace(/\s+/g, "").trim();
    const normalized = cleaned.startsWith("+") ? cleaned : (cleaned.length === 10 ? `+91${cleaned}` : cleaned);

    if (!/^\+91\d{10}$/.test(normalized)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(normalized);
      setConfirmationResult(res);
      setStep("otp");
      setMessage("Verification code sent to your phone.");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (otp.length !== 6 || !confirmationResult) {
      setError("Enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(confirmationResult, otp);
      setStep("profile");
      setMessage("Phone verified! Please complete your account details.");
    } catch (err: any) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    try {
      await updateCurrentUser({
        name: name.trim(),
        email: email.trim(),
      });
      alert("Registration successful! Welcome to StayTrack 🎉");
      if (role === "host") {
        router.push("/host/application");
      } else {
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err.message || "Profile update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12 w-full flex-1">
      <GlassCard className="p-8 border border-zinc-200 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white text-xl font-black shadow-md">
            S
          </div>
          <h1 className="text-2xl font-black text-zinc-950 mt-3">Create StayTrack Account</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Join StayTrack for direct stays with ₹0 brokerage
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
            {message}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    role === "customer" ? "bg-black text-white" : "text-zinc-600"
                  }`}
                >
                  Guest / Renter
                </button>
                <button
                  type="button"
                  onClick={() => setRole("host")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    role === "host" ? "bg-black text-white" : "text-zinc-600"
                  }`}
                >
                  Property Host
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-semibold"
              />
            </div>

            <div id="recaptcha-container" className="flex justify-center" />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send Verification OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-4 py-3 text-center text-xl font-bold tracking-[0.4em] rounded-xl border border-zinc-300 bg-zinc-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              type="button"
              onClick={() => {
                resetRecaptcha();
                setStep("phone");
              }}
              className="w-full py-2 text-xs font-semibold text-zinc-600 hover:underline"
            >
              Change Mobile Number
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Completing Registration..." : "Complete Registration"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-zinc-500 pt-4 border-t border-zinc-100">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-black hover:underline">
            Log in
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-zinc-500">Loading Register...</div>}>
        <RegisterContent />
      </Suspense>
      <Footer />
    </div>
  );
}
