"use client";

import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { CrownIcon } from "@/components/ui/Icons";

export default function AdminSubscriptionsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();

  if (guardLoading || !isAdmin) {
    return (
      <div className="py-24 flex items-center justify-center text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-950">Host Subscriptions Management</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">Audit active host subscriptions, plan pricing, and property limit caps</p>
      </div>

      <GlassCard className="border border-zinc-200 p-8 shadow-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 flex items-center justify-center mx-auto mb-2">
          <CrownIcon className="w-6 h-6 text-[#D9A441]" />
        </div>
        <h3 className="text-base font-bold text-zinc-950 mt-3">Subscriptions Portal</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
          Host subscriptions are processed via Razorpay and verified by Spring Boot backend.
        </p>
      </GlassCard>
    </main>
  );
}
