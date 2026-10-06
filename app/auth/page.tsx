"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import {
  sendOtp,
  verifyOtp,
  getIdToken,
  resetRecaptcha,
  signInWithGoogle,
} from "@/lib/auth";
import { getCurrentUser, updateCurrentUser } from "@/lib/api";

function normalizePhoneNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");

  if (value.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  return digitsOnly ? `+${digitsOnly}` : "";
}

function getFriendlyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  const message = error.message;

  if (message.includes("auth/invalid-phone-number")) {
    return "Please enter a valid 10-digit mobile number.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait and try again later.";
  }

  if (message.includes("auth/invalid-verification-code")) {
    return "The OTP is incorrect. Please check it and try again.";
  }

  if (message.includes("auth/code-expired")) {
    return "The OTP has expired. Please request a new OTP.";
  }

  if (message.includes("auth/captcha-check-failed")) {
    return "reCAPTCHA verification failed. Please refresh and try again.";
  }

  if (message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in popup was closed before completing.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "Google Sign-In is not enabled in your Firebase project. Please enable the Google provider in Firebase Console under Authentication > Sign-in method > Google.";
  }

  if (message.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized for Google Sign-In. Please add your domain to Firebase Console under Authentication > Settings > Authorized domains.";
  }

  if (message.includes("auth/popup-blocked")) {
    return "Google Sign-In popup was blocked by your browser. Please allow popups for this site.";
  }

  return message;
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect") || "";
  const modeParam = searchParams.get("mode") || "login";
  const isRegister = modeParam === "register";

  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Reset state when switching modes
  useEffect(() => {
    resetRecaptcha();
    setConfirmationResult(null);
    setStep("phone");
    setPhone("");
    setOtp("");
    setMessage("");
    setError("");
  }, [modeParam]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedPhone = normalizePhoneNumber(phone);

    if (!/^\+91\d{10}$/.test(normalizedPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210).");
      return;
    }

    setLoading(true);

    try {
      const result = await sendOtp(normalizedPhone);
      setConfirmationResult(result);
      setStep("otp");
      setMessage("Verification code sent to your mobile number.");
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanedOtp = otp.replace(/\D/g, "");

    if (cleanedOtp.length !== 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    if (!confirmationResult) {
      setError("Please request an OTP first.");
      return;
    }

    setLoading(true);

    try {
      await verifyOtp(confirmationResult, cleanedOtp);

      if (isRegister) {
        // Move to optional profile completion step in registration mode
        setStep("profile");
        setMessage("Phone verified! Please complete your account details.");
        setLoading(false);
      } else {
        await processPostAuthRedirection();
      }
    } catch (err) {
      setError(getFriendlyError(err));
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage("");
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      await processPostAuthRedirection();
    } catch (err) {
      setError(getFriendlyError(err));
      setGoogleLoading(false);
    }
  }

  async function handleCompleteProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      await processPostAuthRedirection();
    } catch (err) {
      setError(getFriendlyError(err));
      setLoading(false);
    }
  }

  const handleBack = () => {
    const returnTarget = searchParams.get("returnTo") || searchParams.get("redirect") || "";
    const protectedPrefixes = ["/trips", "/booking", "/chat", "/profile", "/host", "/admin", "/notifications"];

    // 1. If history exists and referrer is from current domain and not auth page or protected page:
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host) &&
      !document.referrer.includes("/auth")
    ) {
      try {
        const refUrl = new URL(document.referrer);
        const refPath = refUrl.pathname;
        const isRefProtected = protectedPrefixes.some((p) => refPath.startsWith(p));
        if (!isRefProtected) {
          router.back();
          return;
        }
      } catch {
        // ignore parse error
      }
    }

    // 2. If returnTarget exists and is NOT a protected page, navigate to returnTarget:
    if (returnTarget && returnTarget.startsWith("/") && !returnTarget.startsWith("//")) {
      const isTargetProtected = protectedPrefixes.some((p) => returnTarget.startsWith(p));
      if (!isTargetProtected) {
        router.push(returnTarget);
        return;
      }
    }

    // 3. Default safe public fallback for unauthenticated back button: / (Explore)
    router.push("/");
  };

  async function processPostAuthRedirection() {
    setMessage("Verifying StayTrack credentials...");

    let userRole = "customer";
    try {
      const idToken = await getIdToken();
      if (idToken) {
        const backendUser = await getCurrentUser(idToken);
        if (backendUser && backendUser.role) {
          userRole = String(backendUser.role).toLowerCase();
        }
      }
    } catch (backendErr) {
      console.warn("Backend profile verification notice:", backendErr);
    }

    setMessage("Authentication successful! Redirecting...");

    if (isRegister) {
      router.replace("/");
      return;
    }

    const rawRedirect = searchParams.get("returnTo") || searchParams.get("redirect") || "";
    if (rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
      router.replace(rawRedirect);
      return;
    }

    if (userRole === "admin") {
      router.replace("/admin");
    } else if (userRole === "host") {
      router.replace("/host");
    } else {
      router.replace("/");
    }
  }

  function handleChangeNumber() {
    resetRecaptcha();
    setConfirmationResult(null);
    setStep("phone");
    setOtp("");
    setMessage("");
    setError("");
  }

  const returnTarget = searchParams.get("returnTo") || searchParams.get("redirect") || "";
  const toggleLinkHref = returnTarget
    ? `/auth?mode=${isRegister ? "login" : "register"}&returnTo=${encodeURIComponent(returnTarget)}`
    : `/auth?mode=${isRegister ? "login" : "register"}`;

  return (
    <main className="mx-auto max-w-md px-6 py-12 w-full flex-1 flex items-center justify-center">
      <GlassCard className="p-8 border border-zinc-200 shadow-xl w-full relative">
        {/* Visible Back Button Top-Left Inside Card */}
        <div className="mb-4 flex items-center justify-start">
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-600 hover:bg-zinc-100 hover:text-black transition-all cursor-pointer border border-transparent hover:border-zinc-200"
            aria-label="Go back"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back</span>
          </button>
        </div>
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <img
              src="/logo.png"
              alt="StayTrack"
              className="h-10 w-auto mx-auto object-contain"
            />
          </Link>
          <h1 className="text-2xl font-black text-zinc-950 mt-4">
            {isRegister ? "Create StayTrack Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            {isRegister
              ? "Join StayTrack to discover verified stays across Delhi NCR"
              : "Sign in to your StayTrack account"}
          </p>
        </div>

        {/* Feedback Messages */}
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

        {/* Step 1: Google-Only Sign-In (Phone/OTP flow hidden for now) */}
        {step !== "profile" && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50 hover:border-zinc-400 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              <span>
                {googleLoading ? "Signing in with Google..." : "Continue with Google"}
              </span>
            </button>
          </div>
        )}

        {/* Step 3: Profile Completion (Only for Registration) */}
        {step === "profile" && (
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-xs font-semibold text-black outline-none focus:border-black"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-xs font-semibold text-black outline-none focus:border-black"
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

        {/* Bottom Mode Toggle Link */}
        <div className="mt-6 text-center text-xs text-zinc-500 pt-4 border-t border-zinc-100">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href={toggleLinkHref} className="font-bold text-black hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Link href={toggleLinkHref} className="font-bold text-black hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      </GlassCard>
    </main>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center py-16 text-xs font-bold text-zinc-500">
            Loading Auth...
          </div>
        }
      >
        <AuthContent />
      </Suspense>
      <Footer />
    </div>
  );
}
