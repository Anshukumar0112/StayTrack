"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import { getSubscriptionPlans, getMySubscription, createSubscriptionOrder, verifySubscriptionPayment } from "@/lib/api";
import { SubscriptionPlan, HostSubscription } from "@/types/host";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function HostSubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<HostSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const [plansData, subData] = await Promise.allSettled([
        getSubscriptionPlans(),
        getMySubscription(),
      ]);

      if (plansData.status === "fulfilled" && Array.isArray(plansData.value)) {
        setPlans(plansData.value);
      }
      if (subData.status === "fulfilled" && subData.value) {
        setSubscription(subData.value);
      }
    } catch (err) {
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
    try {
      const orderRes = await createSubscriptionOrder();

      const options = {
        key: orderRes.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "StayTrack Host Pro Subscription",
        description: "Unlimited Property Listings Plan",
        order_id: orderRes.orderId || orderRes.id,
        handler: async function (response: any) {
          try {
            await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert("Subscription Activated Successfully! 🎉");
            fetchSubscriptionData();
          } catch (err: any) {
            alert("Subscription payment verification failed: " + err.message);
          }
        },
        theme: { color: "#000000" },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay checkout SDK loading...");
      }
    } catch (err: any) {
      alert("Failed to create subscription order: " + err.message);
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8 text-center">
          <span className="clay-badge px-3 py-1 text-xs font-extrabold uppercase">
            HOST SUBSCRIPTION PORTAL
          </span>
          <h1 className="text-3xl font-black text-zinc-950 mt-3">Host Plans & Property Limits</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Subscribe to list additional properties with direct guest communication
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading subscription details...</div>
        ) : (
          <div className="space-y-8">
            {/* Current Active Plan Status */}
            <GlassCard className="border border-zinc-200 p-8 shadow-xl bg-zinc-950 text-white">
              <div className="flex justify-between items-start flex-wrap gap-4 pb-6 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">
                    ACTIVE SUBSCRIPTION
                  </span>
                  <h2 className="text-2xl font-black text-white">
                    {subscription ? "Host Pro Subscription" : "Standard Host Account"}
                  </h2>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  subscription?.status === "active" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"
                }`}>
                  STATUS: {subscription?.status || "Free Plan"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs text-zinc-300">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Property Listing Limit</span>
                  <span className="text-base font-bold text-white">
                    {subscription ? "Unlimited Properties" : "1 Property Limit"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Platform Terms</span>
                  <span className="text-base font-bold text-emerald-400">Direct Payouts</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Expiration Date</span>
                  <span className="text-base font-bold text-white">
                    {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : "No Expiry"}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Subscribe Action Card */}
            <ClayCard className="p-8 border border-zinc-200 text-center space-y-4">
              <span className="text-4xl">⭐</span>
              <h3 className="text-2xl font-black text-zinc-950">Upgrade To Host Pro</h3>
              <p className="text-xs text-zinc-600 font-medium max-w-md mx-auto leading-relaxed">
                Unlock unlimited property listings, priority placement in search results, and instant Razorpay Route automated settlement transfers.
              </p>

              <div className="py-4">
                <span className="text-4xl font-black text-black">₹999</span>
                <span className="text-xs font-semibold text-zinc-500"> / year</span>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={buyLoading}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                {buyLoading ? "Initiating Checkout..." : "💳 Activate Host Pro Subscription"}
              </button>
            </ClayCard>
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
