"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

import {
  sendOtp,
  verifyOtp,
  getIdToken,
  resetRecaptcha,
} from "@/lib/auth";

import { getCurrentUser } from "@/lib/api";

type RoleVariant = "customer" | "host" | "admin";

function normalizePhoneNumber(value: string): string {
  const cleaned = value.replace(/\s+/g, "").trim();

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  return cleaned;
}

function getFriendlyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  const message = error.message;

  if (message.includes("auth/invalid-phone-number")) {
    return "Please enter a valid mobile number.";
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

  return message;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect") || "";
  const paramRole = (searchParams.get("role") || "customer").toLowerCase() as RoleVariant;

  const [activeRole, setActiveRole] = useState<RoleVariant>("customer");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (paramRole === "host" || paramRole === "admin" || paramRole === "customer") {
      setActiveRole(paramRole);
    }
  }, [paramRole]);

  function handleRoleTabChange(role: RoleVariant) {
    resetRecaptcha();
    setActiveRole(role);
    setConfirmationResult(null);
    setOtp("");
    setMessage("");
    setError("");
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedPhone = normalizePhoneNumber(phone);

    if (!/^\+91\d{10}$/.test(normalizedPhone)) {
      setError("Enter a valid Indian mobile number (e.g. +91 98765 43210).");
      return;
    }

    setLoading(true);

    try {
      const result = await sendOtp(normalizedPhone);
      setConfirmationResult(result);
      setMessage("OTP sent successfully.");
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
      setError("Please enter the 6-digit OTP.");
      return;
    }

    if (!confirmationResult) {
      setError("Please request an OTP first.");
      return;
    }

    setLoading(true);

    try {
      await verifyOtp(confirmationResult, cleanedOtp);
      setMessage("Verifying your StayTrack account...");

      let userRole = activeRole;
      try {
        const idToken = await getIdToken();
        if (idToken) {
          const backendUser = await getCurrentUser(idToken);
          if (backendUser && backendUser.role) {
            userRole = String(backendUser.role).toLowerCase() as RoleVariant;
          }
        }
      } catch (backendErr) {
        console.warn("Backend user fetch notice:", backendErr);
      }

      // Enforce Admin Role check when logging in via Admin Variant
      if (activeRole === "admin" && userRole !== "admin") {
        setError("Access Denied: You do not have Administrator privileges.");
        setLoading(false);
        return;
      }

      setMessage("Login successful. Redirecting...");

      if (redirectUrl) {
        router.replace(redirectUrl);
        return;
      }

      if (userRole === "admin") {
        router.replace("/admin");
      } else if (userRole === "host") {
        router.replace("/host/dashboard");
      } else if (activeRole === "host") {
        router.replace("/host/apply");
      } else {
        router.replace("/home");
      }
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Instant Demo Bypass for Testing & Local Development
  function handleDemoLogin(role: RoleVariant) {
    setLoading(true);
    setMessage(`Logging in as Demo ${role.toUpperCase()}...`);
    setTimeout(() => {
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else if (role === "admin") {
        router.replace("/admin");
      } else if (role === "host") {
        router.replace("/host/dashboard");
      } else {
        router.replace("/home");
      }
    }, 600);
  }

  function handleChangeNumber() {
    resetRecaptcha();
    setConfirmationResult(null);
    setOtp("");
    setMessage("");
    setError("");
  }

  const branding = {
    customer: {
      title: "Guest Login",
      subtitle: "Find, Book & Stay Direct with ₹0 Brokerage",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700",
    },
    host: {
      title: "Host Portal Login",
      subtitle: "Manage your properties, bookings & direct payouts",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    admin: {
      title: "Admin Administration Portal",
      subtitle: "System Control Panel & Security Access",
      badgeColor: "bg-slate-800 text-white border-slate-700",
      buttonColor: "bg-slate-900 hover:bg-black",
    },
  }[activeRole];

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10 text-black">
      <div className="flex min-h-[85vh] items-center justify-center">
        <div className="w-full max-w-[500px] rounded-[24px] border border-gray-200 bg-white p-8 shadow-[0_15px_50px_rgba(0,0,0,0.08)] sm:p-10">
          
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-black text-3xl font-bold text-white shadow-lg">
              S
            </div>
          </div>

          {/* Title */}
          <div className="mt-5 text-center">
            <h1 className="text-3xl font-bold tracking-tight">StayTrack</h1>
            <p className="mt-1 text-sm text-gray-500">{branding.subtitle}</p>
          </div>

          {/* Role Variant Tabs */}
          <div className="mt-6 flex rounded-xl border border-gray-200 bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => handleRoleTabChange("customer")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                activeRole === "customer"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Guest / User
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange("host")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                activeRole === "host"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Host Portal
            </button>

            <button
              type="button"
              onClick={() => handleRoleTabChange("admin")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                activeRole === "admin"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Admin
            </button>
          </div>

          {/* Active Variant Badge */}
          <div className="mt-4 text-center">
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${branding.badgeColor}`}>
              {branding.title}
            </span>
          </div>

          {!confirmationResult ? (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-5">
              <div>
                <label htmlFor="phone" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Mobile Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-base font-medium outline-none transition focus:border-black focus:bg-white disabled:opacity-60 text-black"
                />
              </div>

              <div id="recaptcha-container" className="flex justify-center" />

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl px-4 py-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${branding.buttonColor}`}
              >
                {loading ? "Sending Verification OTP..." : `Send OTP (${branding.title})`}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
                <h2 className="text-base font-bold text-gray-900">Verify Mobile OTP</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Enter 6-digit code sent to <span className="font-bold text-black">{normalizePhoneNumber(phone)}</span>
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Security Code (OTP)
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  placeholder="1  2  3  4  5  6"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-xl font-bold tracking-[0.45em] outline-none transition focus:border-black focus:bg-white disabled:opacity-60 text-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl px-4 py-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${branding.buttonColor}`}
              >
                {loading ? "Verifying Credentials..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={handleChangeNumber}
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Change Number
              </button>
            </form>
          )}

          {/* Instant Demo Sign-In Shortcut */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Fast Demo Sign-In
            </span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("customer")}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
              >
                Demo Guest
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("host")}
                className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                Demo Host
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("admin")}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Demo Admin
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs font-medium text-gray-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-semibold text-gray-500">
        Loading Login...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}