/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import BackButton from "@/components/ui/BackButton";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge, { BadgeVariant } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useUser, cacheUserProfile } from "@/hooks/useUser";
import { updateCurrentUser } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LogOutIcon,
  CheckIcon,
} from "@/components/ui/Icons";

const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export default function ProfilePage() {
  const router = useRouter();
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { user, loading: userLoading, error: userError, refetch: refetchUser } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});

  const isLoading = authLoading || (userLoading && !user);

  // Sync form inputs when user profile loads
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    } else if (firebaseUser) {
      setName(firebaseUser.displayName || "");
      setEmail(firebaseUser.email || "");
    }
  }, [user, firebaseUser]);

  // Auth protection: redirect if unauthenticated once loading completes
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace("/auth?mode=login&returnTo=/profile");
    }
  }, [authLoading, firebaseUser, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const errors: { name?: string; email?: string } = {};

    if (!trimmedName) {
      errors.name = "Full name is required.";
    } else if (trimmedName.length > 100) {
      errors.name = "Full name must not exceed 100 characters.";
    }

    if (trimmedEmail) {
      if (trimmedEmail.length > 254) {
        errors.email = "Email address must not exceed 254 characters.";
      } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
        errors.email = "Please enter a valid email address (e.g. name@domain.com).";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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
      cacheUserProfile(updatedUser);
      setMessage("Profile details saved successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to save profile changes.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      cacheUserProfile(null);
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const isVerifiedProfile = Boolean(user && user.role);
  const role = user?.role || "customer";
  const isHost = role === "host";
  const isAdmin = role === "admin";

  const roleBadgeVariant: BadgeVariant = isHost
    ? "sage"
    : isAdmin
    ? "info"
    : "neutral";

  const roleLabel = isHost
    ? "Verified Host"
    : isAdmin
    ? "System Admin"
    : isVerifiedProfile
    ? "Guest Account"
    : userLoading
    ? "Verifying Permissions..."
    : "Guest Account";

  // Display initial
  const userInitial = name
    ? name.charAt(0).toUpperCase()
    : firebaseUser?.displayName
    ? firebaseUser.displayName.charAt(0).toUpperCase()
    : user?.phone
    ? user.phone.slice(-2)
    : "ST";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : firebaseUser?.metadata?.creationTime
    ? new Date(firebaseUser.metadata.creationTime).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "Member";

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary-soft selection:text-foreground">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:py-8 w-full flex-1">
        {/* Top Header & Back Navigation */}
        <div className="mb-6 sm:mb-8">
          <BackButton
            fallbackUrl="/"
            label="Back to Home"
            ariaLabel="Return to home page"
            className="mb-3.5"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Account & Profile Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage your personal contact details and verified account credentials.
          </p>
        </div>

        {userError && !user && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Unable to verify your account permissions with the server. Please check your connection or retry.</span>
            </div>
            <button
              type="button"
              onClick={() => refetchUser()}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0"
            >
              Retry Sync
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3 animate-pulse">
            <div className="md:col-span-1 h-80 rounded-2xl bg-surface border border-border" />
            <div className="md:col-span-2 h-96 rounded-2xl bg-surface border border-border" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {/* ==================================================== */}
            {/* LEFT COLUMN: PROFILE OVERVIEW HERO                   */}
            {/* ==================================================== */}
            <div className="md:col-span-1 space-y-5">
              <Card variant="standard" className="p-6 text-center space-y-4">
                {/* Avatar */}
                <div className="relative mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-black text-primary shadow-2xs">
                  {firebaseUser?.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={name || "Profile"}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                  <span
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center text-white"
                    title="Active Account"
                  >
                    <CheckIcon className="w-3 h-3 stroke-[3]" />
                  </span>
                </div>

                {/* Identity Summary */}
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground truncate">
                    {name || "StayTrack Member"}
                  </h2>
                  <p className="text-xs text-muted flex items-center justify-center gap-1 font-mono">
                    <PhoneIcon className="w-3 h-3 text-muted shrink-0" />
                    <span>{user?.phone || firebaseUser?.phoneNumber || "No phone connected"}</span>
                  </p>
                </div>

                {/* Role & Status Badges */}
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  <Badge variant={roleBadgeVariant} size="sm">
                    {roleLabel}
                  </Badge>
                  <Badge variant="success" pulseDot size="sm">
                    Active
                  </Badge>
                </div>

                {/* Metadata List */}
                <div className="pt-3 border-t border-border/70 text-xs space-y-2 text-left">
                  <div className="flex items-center justify-between text-muted">
                    <span>Member Since</span>
                    <span className="font-semibold text-foreground">{memberSince}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Profile Status</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      <span>{user?.profileCompleted ? "Complete" : "In Progress"}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Phone Verification</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OTP Verified</span>
                    </span>
                  </div>
                </div>

                {/* Sign Out Action */}
                <div className="pt-3 border-t border-border/70">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-2.5 px-3 rounded-xl border border-error/20 bg-error-soft/30 hover:bg-error-soft/60 text-error font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer focus-ring"
                  >
                    <LogOutIcon className="w-4 h-4 stroke-[2]" />
                    <span>Sign Out of StayTrack</span>
                  </button>
                </div>
              </Card>
            </div>

            {/* ==================================================== */}
            {/* RIGHT COLUMN: EDIT PROFILE & QUICK ACCOUNT ACTIONS   */}
            {/* ==================================================== */}
            <div className="md:col-span-2 space-y-6">
              {/* Edit Profile Form */}
              <Card variant="standard" className="p-6 sm:p-7 space-y-5">
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Personal Information
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Update your legal name and contact email used for accommodation reservations.
                  </p>
                </div>

                <form onSubmit={handleSave} className="space-y-3.5">
                  {/* Full Name */}
                  <Input
                    label="Full Name *"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="Enter your full name"
                    maxLength={100}
                    disabled={saving}
                    error={fieldErrors.name}
                    leftIcon={<UserIcon className="w-4 h-4" />}
                  />

                  {/* Email Address */}
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="name@example.com"
                    maxLength={254}
                    disabled={saving}
                    error={fieldErrors.email}
                    leftIcon={<MailIcon className="w-4 h-4" />}
                  />

                  {/* Phone Number (Read-only) */}
                  <Input
                    label="Phone Number (Verified)"
                    type="tel"
                    value={user?.phone || firebaseUser?.phoneNumber || "Not connected"}
                    disabled
                    readOnly
                    leftIcon={<PhoneIcon className="w-4 h-4" />}
                    rightIcon={<ShieldCheckIcon className="w-4 h-4 text-emerald-600" />}
                  />

                  {/* Account Role (Read-only) */}
                  <Input
                    label="Account Access Role"
                    type="text"
                    value={`${role.toUpperCase()} (System Managed)`}
                    disabled
                    readOnly
                    leftIcon={<ShieldCheckIcon className="w-4 h-4" />}
                  />

                  {/* Feedback Banners */}
                  {error && (
                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">Unable to Save Changes</p>
                        <p className="text-[11px] leading-relaxed">{error}</p>
                      </div>
                    </div>
                  )}

                  {message && (
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">Profile Updated</p>
                        <p className="text-[11px] leading-relaxed">{message}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={saving}
                      disabled={saving}
                      className="w-full sm:w-auto min-w-[180px]"
                    >
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
