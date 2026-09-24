"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function AdminPaymentsPage() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();

  if (guardLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs font-bold text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">Payment Audit & Transfers</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Review transaction status, Razorpay Route settlements, and host subscriptions</p>
        </div>

        <GlassCard className="border border-zinc-200 p-8 shadow-xl text-center space-y-3">
          <span className="text-4xl">💳</span>
          <h3 className="text-base font-bold text-zinc-950">Razorpay Gateway Integration</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            All guest transactions are processed securely through Razorpay client checkout and verified server-side by Spring Boot.
          </p>
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl max-w-md mx-auto">
            🔒 Client security enforced: Secret keys strictly contained within backend environment.
          </div>
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
