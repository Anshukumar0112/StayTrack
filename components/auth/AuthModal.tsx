"use client";

import { FormEvent, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";

import { sendOtp, verifyOtp, getIdToken, resetRecaptcha } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetTitle?: string;
  roleIntent?: "customer" | "host" | "admin";
}

function normalizePhoneNumber(value: string): string {
  const cleaned = value.replace(/\s+/g, "").trim();
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  targetTitle = "Select PG / Property Details",
  roleIntent = "customer",
}: AuthModalProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!/^\+91\d{10}$/.test(normalizedPhone)) {
      setError("Please enter a valid Indian mobile number (+91 98765 43210).");
      return;
    }

    setLoading(true);

    try {
      const result = await sendOtp(normalizedPhone);
      setConfirmationResult(result);
      setMessage("OTP sent to your phone.");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP. Please try again.");
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
      setError("Please enter the 6-digit code.");
      return;
    }

    if (!confirmationResult) {
      setError("Please request OTP first.");
      return;
    }

    setLoading(true);

    try {
      await verifyOtp(confirmationResult, cleanedOtp);
      const idToken = await getIdToken();
      if (!idToken) throw new Error("No token returned.");

      const backendUser = await getCurrentUser(idToken);
      if (!backendUser) throw new Error("Profile creation failed.");

      setMessage("Authentication successful!");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              Authentication Required
            </span>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Log in to continue
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-black"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-xs font-medium text-gray-600">
          You are proceeding to: <span className="font-bold text-black">{targetTitle}</span>
        </p>

        {!confirmationResult ? (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-gray-700">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base font-medium outline-none focus:border-black focus:bg-white"
              />
            </div>

            <div id="recaptcha-container" className="flex justify-center" />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-4 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send Verification OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs text-gray-500">
                Enter code sent to <span className="font-bold text-black">{phone}</span>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-gray-700">
                6-Digit Security Code (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="1 2 3 4 5 6"
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-black focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}

        {message && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-medium text-emerald-800">{message}</div>}
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-800">{error}</div>}
      </div>
    </div>
  );
}
