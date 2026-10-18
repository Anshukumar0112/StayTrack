"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { getSubscriptionSettings, updateSubscriptionSettings, getAiSettings, updateAiSettings } from "@/lib/api";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { CrownIcon, CreditCardIcon, GiftIcon, InfoIcon, SparklesIcon, CheckIcon } from "@/components/ui/Icons";

export default function AdminSettingsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [subMode, setSubMode] = useState<"free" | "paid">("paid");
  const [standardPrice, setStandardPrice] = useState("20");
  const [introductoryPrice, setIntroductoryPrice] = useState("20");
  const [introductoryEnabled, setIntroductoryEnabled] = useState(false);
  const [subLimit, setSubLimit] = useState("10");
  const [billingPeriod, setBillingPeriod] = useState("MONTHLY");
  const [billingInterval, setBillingInterval] = useState("1");
  const [currency, setCurrency] = useState("INR");

  const [aiModel, setAiModel] = useState("gemini-pro");
  const [aiEnabled, setAiEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.allSettled([getSubscriptionSettings(), getAiSettings()])
      .then(([subRes, aiRes]) => {
        if (subRes.status === "fulfilled" && subRes.value) {
          const val = subRes.value;
          setSubMode(val.subscriptionMode === "free" ? "free" : "paid");
          setStandardPrice(String(val.standardPrice ?? val.price ?? 20));
          setIntroductoryPrice(String(val.introductoryPrice ?? 20));
          setIntroductoryEnabled(val.introductoryEnabled === true);
          setSubLimit(String(val.listingPropertyLimit ?? val.propertyLimit ?? 10));
          setBillingPeriod(val.billingPeriod || "MONTHLY");
          setBillingInterval(String(val.billingInterval ?? 1));
          setCurrency(val.currency || "INR");
        }
        if (aiRes.status === "fulfilled" && aiRes.value) {
          setAiModel(aiRes.value.model || "gemini-pro");
          setAiEnabled(aiRes.value.enabled !== false);
        }
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  const handleSaveSubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await updateSubscriptionSettings({
        subscriptionMode: subMode,
        standardPrice: parseInt(standardPrice) || 20,
        introductoryPrice: parseInt(introductoryPrice) || 20,
        introductoryEnabled: introductoryEnabled,
        listingPropertyLimit: parseInt(subLimit) || 10,
        billingPeriod: billingPeriod.toUpperCase(),
        billingInterval: parseInt(billingInterval) || 1,
        currency: currency.toUpperCase(),
      });
      alert("Subscription settings saved successfully!");
    } catch (err: any) {
      alert("Failed to save subscription settings: " + (err.message || "Unknown error"));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await updateAiSettings({
        model: aiModel,
        enabled: aiEnabled,
      });
      alert("AI Search configurations saved!");
    } catch (err: any) {
      alert("Failed to save AI settings: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 w-full flex-1">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-950">System Configuration</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Configure global host billing mode, pricing parameters, property limits, and AI engine settings
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading platform settings...</div>
      ) : (
        <div className="space-y-8">
          {/* Host Subscription & Billing Mode Settings */}
          <GlassCard className="border border-zinc-200 p-6">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200 flex items-center gap-2">
              <CrownIcon className="w-4 h-4 text-[#D9A441] shrink-0" />
              <span>Host Subscription Plan & Billing Mode</span>
            </h2>

            <form onSubmit={handleSaveSubSettings} className="space-y-6">
              {/* Mode Toggle */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-700 uppercase mb-2">
                  Global Subscription Billing Mode
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-100 rounded-2xl border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setSubMode("paid")}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                      subMode === "paid" ? "bg-black text-white shadow-md" : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    <CreditCardIcon className="w-4 h-4 shrink-0" />
                    <span>Paid Subscription Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubMode("free")}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                      subMode === "free" ? "bg-emerald-600 text-white shadow-md" : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    <GiftIcon className="w-4 h-4 shrink-0" />
                    <span>Free / Testing Mode</span>
                  </button>
                </div>

                {subMode === "free" && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-start gap-2">
                    <InfoIcon className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>FREE / TESTING MODE ACTIVE:</strong> Approved hosts can list properties without purchasing or activating a subscription. Razorpay payment gating is disabled for property creation.
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing & Duration Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Standard Price (₹)
                  </label>
                  <input
                    type="number"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    disabled={subMode === "free"}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Introductory Price (₹)
                  </label>
                  <input
                    type="number"
                    value={introductoryPrice}
                    onChange={(e) => setIntroductoryPrice(e.target.value)}
                    disabled={subMode === "free" || !introductoryEnabled}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Listing Property Limit
                  </label>
                  <input
                    type="number"
                    value={subLimit}
                    onChange={(e) => setSubLimit(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
                  />
                  <span className="text-[10px] text-zinc-500">Max properties a host can list (0 = unlimited).</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Billing Period & Frequency
                  </label>
                  <input
                    type="text"
                    value={`${billingPeriod} (Every ${billingInterval} month)`}
                    readOnly
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-700 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-zinc-500">Host Pro subscription is charged ₹20 monthly.</span>
                </div>
              </div>

              {/* Introductory Enabled Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-zinc-900">Enable Introductory Pricing</div>
                  <div className="text-[11px] text-zinc-500">Offer new hosts initial introductory plan pricing</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIntroductoryEnabled(!introductoryEnabled)}
                  disabled={subMode === "free"}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    introductoryEnabled ? "bg-black text-white" : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {introductoryEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                >
                  Save Subscription Config
                </button>
              </div>
            </form>
          </GlassCard>

          {/* AI Search Settings */}
          <GlassCard className="border border-zinc-200 p-6">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-accent shrink-0" />
              <span>AI Natural Language Search Config</span>
            </h2>
            <form onSubmit={handleSaveAiSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    AI Model Engine
                  </label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold text-zinc-900"
                  >
                    <option value="gemini-pro">Google Gemini 3.5 Pro</option>
                    <option value="gemini-flash">Google Gemini 3.5 Flash</option>
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    AI Search Module Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
                      aiEnabled ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {aiEnabled ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                        <span>AI Search Active</span>
                      </>
                    ) : (
                      "Disabled"
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                >
                  Save AI Settings
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </main>
  );
}
