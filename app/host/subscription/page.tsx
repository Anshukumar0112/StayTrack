"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import {
  AlertTriangleIcon,
  ShieldCheckIcon,
  CrownIcon,
  CheckIcon,
  CreditCardIcon,
} from "@/components/ui/Icons";
import { getSubscriptionPlans, getMySubscription, createSubscriptionOrder, verifySubscriptionPayment } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function HostSubscriptionPage() {
  const router = useRouter();
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [plansData, subData] = await Promise.allSettled([
        getSubscriptionPlans(),
        getMySubscription(),
      ]);

      if (plansData.status === "fulfilled" && plansData.value) {
        setPlanInfo(plansData.value);
      }
      if (subData.status === "fulfilled" && subData.value) {
        setSubscription(subData.value);
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
        description: "Property Listings Subscription Plan",
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
        theme: { color: "#000000" },
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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/host/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-black transition-all cursor-pointer bg-zinc-100 hover:bg-zinc-200 px-3.5 py-2 rounded-xl"
          >
            ← Back to Host Dashboard
          </button>
        </div>

        <div className="mb-8 text-center">
          <span className="clay-badge px-3 py-1 text-xs font-extrabold uppercase">
            HOST SUBSCRIPTION PORTAL
          </span>
          <h1 className="text-3xl font-black text-zinc-950 mt-3">Host Plans & Property Limits</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Manage your subscription and property listing limits
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5">
            <AlertTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading subscription details...</div>
        ) : (
          <div className="space-y-8">
            {/* Free Mode Info Alert */}
            {isFreeMode && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                <p className="font-extrabold text-sm mb-1 flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free Mode Active</span>
                </p>
                <p className="font-medium">
                  Host subscriptions are currently <strong>FREE</strong>. You can create and list up to {listingLimit} properties without any paid subscription or payment!
                </p>
              </div>
            )}

            {/* Current Active Plan Status */}
            <GlassCard className="border border-zinc-200 p-8 shadow-xl bg-zinc-950 text-white">
              <div className="flex justify-between items-start flex-wrap gap-4 pb-6 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">
                    CURRENT SUBSCRIPTION STATUS
                  </span>
                  <h2 className="text-2xl font-black text-white">
                    {isFreeMode
                      ? "Free Host Access"
                      : subStatus === "ACTIVE"
                      ? "Host Pro Subscription"
                      : subStatus === "PAUSED"
                      ? "Subscription Paused"
                      : subStatus === "EXPIRED"
                      ? "Subscription Expired"
                      : "Standard Host Account"}
                  </h2>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  subStatus === "ACTIVE" || subStatus === "FREE"
                    ? "bg-emerald-600 text-white"
                    : subStatus === "PAUSED"
                    ? "bg-amber-500 text-white"
                    : subStatus === "EXPIRED"
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-300"
                }`}>
                  STATUS: {subStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs text-zinc-300">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Property Listing Limit</span>
                  <span className="text-base font-bold text-white">
                    Up to {listingLimit} {listingLimit === 1 ? "Property" : "Properties"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Billing Mode</span>
                  <span className="text-base font-bold text-emerald-400">
                    {isFreeMode ? "Free / Testing Mode" : "Paid Mode"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Expiration Date</span>
                  <span className="text-base font-bold text-white">
                    {isFreeMode
                      ? "No Expiry (Free)"
                      : subscription?.subscription?.endDate
                      ? new Date(
                          typeof subscription.subscription.endDate === "object" && subscription.subscription.endDate.seconds
                            ? subscription.subscription.endDate.seconds * 1000
                            : subscription.subscription.endDate
                        ).toLocaleDateString()
                      : "No Active Plan"}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Subscribe Action Card */}
            <ClayCard className="p-8 border border-zinc-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 flex items-center justify-center mx-auto mb-3">
                <CrownIcon className="w-7 h-7 text-[#D9A441]" />
              </div>
              <h3 className="text-2xl font-black text-zinc-950">
                {isFreeMode ? "Host Pro Access Included" : "Upgrade To Host Pro"}
              </h3>
              <p className="text-xs text-zinc-600 font-medium max-w-md mx-auto leading-relaxed">
                {isFreeMode
                  ? "Free mode is enabled across the platform. You do not need to make any payment to publish your property listings."
                  : `List up to ${listingLimit} properties, direct guest communication, and automated Razorpay payout support.`}
              </p>

              {!isFreeMode && (
                <div className="py-4">
                  <span className="text-4xl font-black text-black">
                    ₹{planInfo?.amount ?? 20}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    {" "}
                    / month
                  </span>
                  {planInfo?.plan?.includes("Introductory") && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md">
                      Introductory Offer!
                    </span>
                  )}
                </div>
              )}

              {isFreeMode ? (
                <button
                  disabled
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-200 text-zinc-600 text-xs font-bold cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span>Free Mode Active (No Payment Required)</span>
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={buyLoading || subStatus === "ACTIVE"}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-lg cursor-pointer transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {buyLoading ? (
                    "Initiating Checkout..."
                  ) : subStatus === "ACTIVE" ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-emerald-400" />
                      <span>Active Subscription</span>
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="w-4 h-4" />
                      <span>Activate Host Pro Subscription</span>
                    </>
                  )}
                </button>
              )}
            </ClayCard>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

