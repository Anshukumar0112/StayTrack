"use client";

import { FormEvent, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";

import { sendOtp, verifyOtp, getIdToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";
import { CloseIcon } from "@/components/ui/Icons";

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      setError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative z-[70] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-floating sm:p-8 border border-border">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="rounded-md bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-dark border border-primary/20">
              Authentication Required
            </span>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              Log in to continue
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-surface-muted hover:text-foreground cursor-pointer focus-ring"
            aria-label="Close dialog"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-4 text-xs font-normal text-muted">
          You are proceeding to: <span className="font-semibold text-foreground">{targetTitle}</span>
        </p>

        {!confirmationResult ? (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={loading}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-normal outline-none focus-ring text-foreground placeholder:text-muted/60 hover:border-border-hover transition-colors"
              />
            </div>

            <div id="recaptcha-container" className="flex justify-center" />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#111716] hover:bg-[#232D2B] py-3 text-sm font-medium text-white transition-all shadow-subtle focus-ring cursor-pointer disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send Verification OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div className="rounded-lg bg-surface-muted p-4 text-center border border-border-subtle">
              <p className="text-xs text-muted">
                Enter code sent to <span className="font-semibold text-foreground">{phone}</span>
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                6-Digit Security Code (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="1 2 3 4 5 6"
                disabled={loading}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-center text-lg font-semibold tracking-[0.3em] outline-none focus-ring text-foreground hover:border-border-hover transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary hover:bg-primary-hover py-3 text-sm font-medium text-white transition-all shadow-subtle focus-ring cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}

        {message && <div className="mt-4 rounded-lg bg-primary-light p-3 text-center text-xs font-medium text-primary-dark border border-primary/20">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-error-light p-3 text-center text-xs font-medium text-error border border-error/20">{error}</div>}
      </div>
    </div>
  );
}
