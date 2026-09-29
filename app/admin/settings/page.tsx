"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { getSubscriptionSettings, updateSubscriptionSettings, getAiSettings, updateAiSettings } from "@/lib/api";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function AdminSettingsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [subPrice, setSubPrice] = useState("999");
  const [subLimit, setSubLimit] = useState("10");

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
          setSubPrice(subRes.value.price || "999");
          setSubLimit(subRes.value.propertyLimit || "10");
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
        price: parseFloat(subPrice),
        propertyLimit: parseInt(subLimit),
      });
      alert("Subscription pricing settings saved!");
    } catch (err: any) {
      alert("Failed to save subscription settings: " + err.message);
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
          <p className="text-xs text-zinc-500 font-semibold mt-1">Configure global host pricing, property limits, and AI model parameters</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold text-zinc-500">Loading platform settings...</div>
        ) : (
          <div className="space-y-8">
            {/* Host Subscription Pricing Settings */}
            <GlassCard className="border border-zinc-200 p-6">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200">
                ⭐ Host Subscription Plan Pricing
              </h2>
              <form onSubmit={handleSaveSubSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                      Monthly Price (₹)
                    </label>
                    <input
                      type="number"
                      value={subPrice}
                      onChange={(e) => setSubPrice(e.target.value)}
                      className="glass-input w-full px-4 py-3 rounded-xl text-xs font-bold"
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
                  </div>
                </div>

                <div className="flex justify-end">
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
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-200">
                ✨ AI Natural Language Search Config
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
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                        aiEnabled ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {aiEnabled ? "✓ AI Search Active" : "Disabled"}
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
