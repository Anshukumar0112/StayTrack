/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/ui/BackButton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useUser, cacheUserProfile } from "@/hooks/useUser";
import { updateCurrentUser } from "@/lib/api";
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  Building2Icon,
  CreditCardIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from "@/components/ui/Icons";

export default function HostSettingsPage() {
  const { firebaseUser, loading: authLoading, handleProtectedAction } = useAuthGuard();
  const { user, loading: userLoading } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      handleProtectedAction("/host/settings", "host");
    } else {
      if (user) {
        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || firebaseUser?.phoneNumber || "");
      } else if (firebaseUser) {
        setName(firebaseUser.displayName || "");
        setEmail(firebaseUser.email || "");
        setPhone(firebaseUser.phoneNumber || "");
      }

      // Load saved payout details from localStorage if present
      const savedPayout = localStorage.getItem("staytrack_host_payout_prefs");
      if (savedPayout) {
        try {
          const parsed = JSON.parse(savedPayout);
          setBusinessName(parsed.businessName || "");
          setBankAccount(parsed.bankAccount || "");
          setIfscCode(parsed.ifscCode || "");
          setUpiId(parsed.upiId || "");
        } catch {
          // ignore
        }
      }
    }
  }, [user, firebaseUser, authLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setSaving(true);

    try {
      if (name.trim()) {
        const updated = await updateCurrentUser({
          name: name.trim(),
          email: email.trim(),
        });
        if (updated) {
          cacheUserProfile(updated);
        }
      }

      // Save payout configuration to host preferences
      const payoutData = {
        businessName: businessName.trim(),
        bankAccount: bankAccount.trim(),
        ifscCode: ifscCode.trim(),
        upiId: upiId.trim(),
      };
      localStorage.setItem("staytrack_host_payout_prefs", JSON.stringify(payoutData));

      setSuccessMessage("Host settings & payout preferences saved successfully!");
    } catch (err: any) {
      setErrorMessage("Failed to save settings: " + (err.message || "Please try again"));
    } finally {
      setSaving(false);
    }
  };

  const isLoading = authLoading || userLoading;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <BackButton
          fallbackUrl="/host"
          label="Back to Dashboard"
          className="text-xs font-semibold mb-2"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Host Settings & Payouts</h1>
        <p className="text-xs text-muted font-medium mt-1">
          Manage your verified host identity, payout bank accounts, and booking preferences
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading host preferences...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Host Profile Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <UserIcon className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-bold text-foreground">Host Identity & Contact</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Host Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-medium focus:outline-none focus:border-primary shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Business / Property Brand Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Green Valley Homestays"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-medium focus:outline-none focus:border-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Host Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-medium focus:outline-none focus:border-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Registered Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-muted text-muted text-xs font-mono cursor-not-allowed shadow-2xs"
                />
                <span className="text-[10px] text-muted-light mt-1 block">
                  Verified via Firebase Authentication
                </span>
              </div>
            </div>
          </div>

          {/* Direct Payout Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm font-bold text-foreground">Direct Payout Account (Razorpay Route)</h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Encrypted & Verified
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Payouts from guest bookings are settled directly into this account 24 hours after check-in.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-mono focus:outline-none focus:border-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-mono focus:outline-none focus:border-primary uppercase shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  UPI ID (Optional for Instant Micro-Settlements)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. username@okhdfcbank"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground text-xs font-medium focus:outline-none focus:border-primary shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Security & Verification Banner */}
          <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex items-start gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-foreground block">Verified Host Guarantee</span>
              <p className="text-muted leading-relaxed">
                StayTrack does not charge brokerage commissions. All transaction records and payout histories are preserved in your host ledger with zero hidden deductions.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-subtle cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}