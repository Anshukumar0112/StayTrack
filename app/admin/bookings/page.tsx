"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";

export default function AdminBookingsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-950">Platform Bookings Console</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Audit all customer booking requests, payment statuses, and host confirmations</p>
        </div>

        <GlassCard className="border border-zinc-200 p-8 shadow-xl text-center">
          <span className="text-4xl">📅</span>
          <h3 className="text-base font-bold text-zinc-950 mt-3">Platform Bookings Management</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Bookings are created via guest requests and confirmed through host acceptance & Razorpay verification.
          </p>
        </GlassCard>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
