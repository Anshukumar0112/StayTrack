"use client";

import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function AdminReportsPage() {
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
        <h1 className="text-3xl font-black text-zinc-950">Platform Issue Reports</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">Audit platform reports, property flags, and user tickets</p>
      </div>

      <GlassCard className="border border-zinc-200 p-8 shadow-xl text-center space-y-3">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-base font-bold text-zinc-950">Report Lifecycle Pending Backend</h3>
        <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
          The automated issue reporting and dispute resolution microservice endpoint is pending backend service deployment.
        </p>
        <div className="inline-block px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold rounded-full">
          Status: Pending Backend Implementation
        </div>
      </GlassCard>
    </main>
  );
}
