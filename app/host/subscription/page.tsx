"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import {
  AlertTriangleIcon,
  ShieldCheckIcon,
  CrownIcon,
  CheckIcon,
  CloseIcon,
  CreditCardIcon,
  Building2Icon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import {
  getSubscriptionPlans,
  getMySubscription,
  getMyProperties,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "@/lib/api";
import { Property } from "@/types/property";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How does the property listing allowance work?",
    answer:
      "Each subscription tier determines the maximum number of properties you can publish simultaneously. For example, Host Pro allows listing up to your configured property limit (e.g. 10 properties). If you reach your limit, you can unpublish an older listing or upgrade your tier to add more.",
  },
  {
    question: "How do guest payments and host payouts work?",
    answer:
      "All guest bookings on StayTrack are processed securely via Razorpay. Once a booking is confirmed and the guest checks in, your host payouts are automatically settled to your verified bank account without hidden platform deductions.",
  },
  {
    question: "What is Free / Testing Mode?",
    answer:
      "When the platform administrator enables Free Mode, all approved hosts receive complimentary Host Pro access. You can publish properties up to the configured limit without entering card details or paying any subscription fees.",
  },
  {
    question: "Can I cancel or change my plan at any time?",
    answer:
      "Yes. Subscriptions are billed on a flexible monthly or annual basis. When you choose not to renew, your existing listings remain safe, and your account gracefully transitions back to the Starter tier at the end of your billing cycle.",
  },
  {
    question: "What payment methods are supported for Host Pro?",
    answer:
      "We support all major Indian and international payment methods through Razorpay, including UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards (Visa, Mastercard, RuPay), Net Banking across 50+ banks, and popular digital wallets.",
  },
];

export default function HostSubscriptionPage() {
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [plansData, subData, propertiesData] = await Promise.allSettled([
        getSubscriptionPlans(),
        getMySubscription(),
        getMyProperties(),
      ]);

      if (plansData.status === "fulfilled" && plansData.value) {
        setPlanInfo(plansData.value);
      }
      if (subData.status === "fulfilled" && subData.value) {
        setSubscription(subData.value);
      }
      if (propertiesData.status === "fulfilled" && Array.isArray(propertiesData.value)) {
        setProperties(propertiesData.value);
      }
    } catch (err: any) {
      console.warn("Failed to load subscription info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();

    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSubscribe = async () => {
    setBuyLoading(true);
    setErrorMessage("");
    try {
      const orderRes = await createSubscriptionOrder();

      const options = {
        key: orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack Host Pro Subscription",
        description: "Host Property Listing Plan",
        order_id: orderRes.orderId || orderRes.id,
        handler: async function (response: any) {
          try {
            await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert("Subscription Activated Successfully!");
            fetchSubscriptionData();
          } catch (err: any) {
            setErrorMessage("Subscription payment verification failed: " + (err.message || "Unknown error"));
          }
        },
        theme: { color: "#718D87" },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setErrorMessage("Razorpay checkout SDK loading... Please try again in a moment.");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to create subscription order";
      if (msg.includes("Razorpay Key ID is not configured")) {
        setErrorMessage("Payment gateway is currently not configured by Admin (Missing Razorpay Key ID). Please contact support or system admin.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setBuyLoading(false);
    }
  };

  const isFreeMode = (subscription?.subscriptionMode || planInfo?.subscriptionMode) === "free";
  const subStatus = subscription?.status || (isFreeMode ? "FREE" : "NONE");
  const listingLimit = subscription?.listingPropertyLimit || planInfo?.listingPropertyLimit || 10;
  const activePropertyCount = properties.length;
  const usagePercentage = Math.min(100, Math.round((activePropertyCount / (listingLimit || 1)) * 100));

  // Dynamic pricing calculations from backend configuration
  const monthlyPrice = planInfo?.amount ?? planInfo?.standardPrice ?? 20;
  const isIntroductory = Boolean(planInfo?.introductoryEnabled && planInfo?.plan?.includes("Introductory"));
  const annualMonthlyEquivalent = Math.max(1, Math.round(monthlyPrice * 0.8));
  const annualTotalPrice = annualMonthlyEquivalent * 12;

  const getRenewalDate = () => {
    if (isFreeMode) return "Complimentary (Free Mode)";
    if (!subscription?.subscription?.endDate) return "No Active Expiry";
    const raw = subscription.subscription.endDate;
    const ms = typeof raw === "object" && raw.seconds ? raw.seconds * 1000 : raw;
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 w-full">
      {/* Top Breadcrumb & Page Header */}
      <div>
        <BackButton
          fallbackUrl="/host"
          label="Back to Dashboard"
          className="text-xs font-semibold mb-3 inline-flex items-center gap-1.5 text-muted hover:text-foreground transition-colors"
        />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold uppercase tracking-wider mb-2">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Host Subscription & Allowance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Plans & Pricing for Hosts
            </h1>
            <p className="text-xs sm:text-sm text-muted font-medium mt-1 max-w-2xl">
              Select the ideal property listing allowance and feature set to expand your hospitality business on StayTrack.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-surface-muted border border-border rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-surface text-foreground shadow-subtle border border-border"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-surface text-foreground shadow-subtle border border-border"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs font-bold rounded-2xl border border-rose-200 flex items-start gap-2.5 shadow-subtle">
          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold">Checkout Notice</p>
            <p className="font-medium text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Free Mode Platform Banner */}
      {isFreeMode && !loading && (
        <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-emerald-900 text-xs shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
                <span>Free Platform Mode Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 text-emerald-900">
                  Complimentary
                </span>
              </p>
              <p className="font-medium text-emerald-800 mt-0.5">
                Host subscriptions are currently completely free. You can create, edit, and publish up to {listingLimit} properties with zero payment required.
              </p>
            </div>
          </div>
          <Link
            href="/host/properties/new"
            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>List New Property</span>
          </Link>
        </div>
      )}

      {/* Overview & Usage Banner Card */}
      {!loading && (
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <CrownIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Current Host Status
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-foreground">
                  {isFreeMode
                    ? "Host Pro (Free Testing Access)"
                    : subStatus === "ACTIVE"
                    ? "Host Pro Active"
                    : subStatus === "PAUSED"
                    ? "Host Subscription Paused"
                    : subStatus === "EXPIRED"
                    ? "Host Pro Expired"
                    : "Starter Host Tier"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                  subStatus === "ACTIVE" || subStatus === "FREE"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : subStatus === "PAUSED"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : subStatus === "EXPIRED"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : "bg-surface-muted text-muted border border-border"
                }`}
              >
                {subStatus === "FREE" ? "FREE ACCESS" : `STATUS: ${subStatus}`}
              </span>
              <Link
                href="/host/properties"
                className="px-3 py-1 text-xs font-bold rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition-colors inline-flex items-center gap-1"
              >
                <span>View My Listings</span>
                <ExternalLinkIcon className="w-3 h-3 text-muted" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-xs">
            <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-muted block uppercase font-bold text-[10px]">Property Allowance</span>
                <span className="text-[11px] font-extrabold text-foreground">
                  {activePropertyCount} / {listingLimit} Listed
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-muted mt-2">
                {listingLimit - activePropertyCount > 0
                  ? `${listingLimit - activePropertyCount} more listings available under current plan`
                  : "Listing capacity reached. Upgrade or archive properties."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
              <span className="text-muted block uppercase font-bold text-[10px]">Billing Mode</span>
              <span className="text-base font-extrabold text-foreground mt-1 block">
                {isFreeMode ? "Complimentary" : "Monthly Auto-Renew"}
              </span>
              <p className="text-[10px] text-muted mt-1">
                {isFreeMode ? "No charges or credit card required" : `Standard pricing ₹${monthlyPrice}/mo`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
              <span className="text-muted block uppercase font-bold text-[10px]">Renewal / Expiry Date</span>
              <span className="text-base font-extrabold text-foreground mt-1 block">
                {getRenewalDate()}
              </span>
              <p className="text-[10px] text-muted mt-1">
                {subStatus === "ACTIVE" ? "Automatic renewal via Razorpay" : "Full access maintained"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Loading State */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center shadow-subtle">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted">Loading plan pricing and host allowance details...</p>
        </div>
      ) : (
        <>
          {/* Subscription Tier Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* TIER 1: Starter Host */}
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-subtle flex flex-col justify-between transition-all hover:border-zinc-300">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-surface-muted text-muted border border-border">
                    Starter
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-foreground">Starter Host</h3>
                <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                  Essential tools for individual hosts publishing their first hospitality stay.
                </p>

                <div className="my-6 pb-6 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-foreground">₹0</span>
                    <span className="text-xs font-semibold text-muted">/ forever</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">Free entry tier with core features</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="text-[11px] font-extrabold text-foreground uppercase tracking-wider mb-2">
                    Included Features:
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>1 Property</strong> listing allowance</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Standard guest booking requests & inquiries</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>In-app guest messaging & chat</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Basic availability calendar</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Standard platform search placement</span>
                  </div>

                  {/* Unavailable features in Starter */}
                  <div className="flex items-start gap-2.5 text-xs text-muted/60 line-through">
                    <CloseIcon className="w-4 h-4 text-muted/40 shrink-0 mt-0.5" />
                    <span>Instant direct reservations</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-muted/60 line-through">
                    <CloseIcon className="w-4 h-4 text-muted/40 shrink-0 mt-0.5" />
                    <span>Verified Host trust badge</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-muted/60 line-through">
                    <CloseIcon className="w-4 h-4 text-muted/40 shrink-0 mt-0.5" />
                    <span>Two-way iCal calendar sync</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-muted/60 line-through">
                    <CloseIcon className="w-4 h-4 text-muted/40 shrink-0 mt-0.5" />
                    <span>Automated bank payouts via Razorpay</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-xl border border-border bg-surface-muted text-muted text-xs font-bold cursor-not-allowed"
                >
                  {subStatus !== "ACTIVE" && !isFreeMode ? "Current Plan (Active)" : "Basic Tier Included"}
                </button>
              </div>
            </div>

            {/* TIER 2: Host Pro (Flagship / Recommended) */}
            <div className="rounded-2xl border-2 border-primary ring-2 ring-primary/20 bg-surface p-6 sm:p-7 shadow-lg flex flex-col justify-between relative">
              {/* Most Popular Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" />
                <span>Most Popular</span>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Recommended Tier
                  </span>
                  {isIntroductory && !isFreeMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Introductory Offer!
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-foreground flex items-center gap-1.5">
                  <span>Host Pro</span>
                  <CrownIcon className="w-4 h-4 text-amber-500" />
                </h3>
                <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                  Full-powered hospitality management, verified guest trust, and automated payouts.
                </p>

                <div className="my-6 pb-6 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    {isFreeMode ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-600">₹0</span>
                        <span className="text-xs font-semibold text-muted">/ complimentary</span>
                      </>
                    ) : billingCycle === "monthly" ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-black text-foreground">₹{monthlyPrice}</span>
                        <span className="text-xs font-semibold text-muted">/ month</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl sm:text-4xl font-black text-foreground">
                          ₹{annualMonthlyEquivalent}
                        </span>
                        <span className="text-xs font-semibold text-muted">/ month</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    {isFreeMode
                      ? "Free platform testing active — no charges apply"
                      : billingCycle === "annual"
                      ? `Billed ₹${annualTotalPrice} annually (2 months free)`
                      : "Billed monthly, cancel anytime"}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="text-[11px] font-extrabold text-primary uppercase tracking-wider mb-2">
                    Pro Benefits & Allowance:
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Up to <strong className="text-primary font-black">{listingLimit} Property</strong> listings
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Verified Host</strong> trust badge on all listings
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Instant guest reservations & direct confirmations</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Automated bank payouts & ledger through Razorpay</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Two-way iCal sync (Airbnb, Booking.com, Google)</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Multi-unit inventory & room tier configurations</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>High-priority placement across search & category feeds</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Full financial analytics, earnings graphs & guest reviews</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Priority 7-day host support & onboarding assistance</span>
                  </div>
                </div>
              </div>

              <div>
                {isFreeMode ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckIcon className="w-4 h-4 text-emerald-600" />
                    <span>Included with Free Mode</span>
                  </button>
                ) : subStatus === "ACTIVE" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-subtle cursor-default inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckIcon className="w-4 h-4 text-emerald-200" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={buyLoading}
                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle cursor-pointer transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {buyLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Initiating Checkout...</span>
                      </>
                    ) : (
                      <>
                        <CreditCardIcon className="w-4 h-4" />
                        <span>Upgrade to Host Pro (₹{billingCycle === "monthly" ? monthlyPrice : annualTotalPrice})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* TIER 3: Host Enterprise / Portfolio */}
            <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-subtle flex flex-col justify-between transition-all hover:border-zinc-300">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-surface-muted text-muted border border-border">
                    Enterprise
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-foreground">Host Enterprise</h3>
                <p className="text-xs text-muted font-medium mt-1 leading-relaxed">
                  Tailored infrastructure for boutique hotels, hostel chains, and large portfolios.
                </p>

                <div className="my-6 pb-6 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-foreground">Custom</span>
                    <span className="text-xs font-semibold text-muted">/ tailored</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">Volume pricing for 10+ properties</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="text-[11px] font-extrabold text-foreground uppercase tracking-wider mb-2">
                    Enterprise Capabilities:
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-foreground font-semibold">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Unlimited</strong> property & room listings</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dedicated hospitality account manager</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Multi-staff team roles & access permissions</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Centralized multi-property calendar dashboard</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Custom Razorpay split-payouts & corporate billing</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Featured sponsored placement across search & categories</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Custom PMS / Channel Manager API integration</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>24/7 dedicated VIP concierge & technical support</span>
                  </div>
                </div>
              </div>

              <div>
                <a
                  href="mailto:support@staytrack.com?subject=StayTrack%20Enterprise%20Host%20Inquiry"
                  className="w-full py-3.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-bold text-center block transition-colors"
                >
                  Contact Enterprise Sales
                </a>
              </div>
            </div>
          </div>

          {/* Host Assurance & Trust Strip */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-subtle">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted text-center mb-6">
              The StayTrack Host Guarantee
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Bank-Grade Razorpay Security</h4>
                <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
                  256-bit encrypted checkout with instant payment verification through our Spring Boot backend.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Instant Feature Activation</h4>
                <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
                  Your listing limit and Pro features unlock instantly the moment your transaction completes.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                  <Building2Icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Flexible & Transparent</h4>
                <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
                  No surprise commission deductions or lock-in contracts. Upgrade or adjust your tier at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions (FAQ) Section */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-subtle">
            <div className="max-w-2xl mx-auto text-center mb-8">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-surface-muted text-muted border border-border mb-2 inline-block">
                Host FAQ
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-muted font-medium mt-1">
                Everything you need to know about host tiers, property limits, and billing.
              </p>
            </div>

            <div className="max-w-3xl mx-auto divide-y divide-border">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group"
                    >
                      <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {faq.question}
                      </span>
                      <span className="text-muted group-hover:text-foreground shrink-0 transition-transform duration-200">
                        {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <p className="text-xs text-muted font-medium mt-3 leading-relaxed animate-in fade-in duration-200">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
