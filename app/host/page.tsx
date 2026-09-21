"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/GlassCard";
import ClayCard from "@/components/ui/ClayCard";
import Link from "next/link";
import { useState } from "react";

export default function HostPage() {
  const [hostType, setHostType] = useState("");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-12 w-full flex-1">
        <div className="text-center mb-10">
          <span className="clay-badge px-4 py-1.5 text-xs font-extrabold">
            HOST ONBOARDING
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-zinc-950 mt-4">
            Become a Host on StayTrack
          </h1>
          <p className="text-sm text-zinc-600 font-medium mt-2 max-w-xl mx-auto">
            List your properties, PGs, or rooms directly to guests with ₹0 commission or brokerage fees.
          </p>
        </div>

        <GlassCard className="border border-zinc-200 p-8 max-w-2xl mx-auto space-y-6 shadow-xl">
          <div>
            <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
              What describes your host profile?
            </label>
            <select
              value={hostType}
              onChange={(e) => setHostType(e.target.value)}
              className="glass-input w-full px-4 py-3.5 rounded-xl text-xs font-bold text-zinc-900"
            >
              <option value="">Select host category</option>
              <option value="BNB">Bed & Breakfast Owner</option>
              <option value="dealer_broker">Dealer / Property Agent</option>
              <option value="hotel_owner">Hotel / Resort Owner</option>
              <option value="pg_owner">PG / Hostel Owner</option>
              <option value="property_manager">Property Manager</option>
              <option value="other">Individual House Owner</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ClayCard className="p-4 text-center border border-zinc-200">
              <span className="text-2xl">💰</span>
              <h4 className="text-xs font-bold text-zinc-950 mt-2">Zero Brokerage</h4>
              <p className="text-[10px] text-zinc-500 font-semibold mt-1">Keep 100% of your stay earnings</p>
            </ClayCard>

            <ClayCard className="p-4 text-center border border-zinc-200">
              <span className="text-2xl">⚡</span>
              <h4 className="text-xs font-bold text-zinc-950 mt-2">Instant Inquiries</h4>
              <p className="text-[10px] text-zinc-500 font-semibold mt-1">Direct messaging with guests</p>
            </ClayCard>
          </div>

          <Link
            href={`/host/apply${hostType ? `?type=${hostType}` : ""}`}
            className="glass-button w-full py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Host Application</span>
            <span>→</span>
          </Link>
        </GlassCard>
      </main>

      <Footer />
    </div>
  );
}