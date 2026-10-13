import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlassCard from "@/components/ui/GlassCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact StayTrack | Customer Support & Host Assistance",
  description: "Get in touch with StayTrack support for guest inquiries, host onboarding, property verification, and Delhi NCR stay assistance.",
  alternates: {
    canonical: "https://staytrack.in/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Contact StayTrack Support
          </h1>
          <p className="text-xs sm:text-sm text-muted font-semibold mt-2">
            We are here to help guests and property hosts across Delhi NCR.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <GlassCard className="p-6 border border-border bg-surface">
            <h2 className="text-lg font-bold text-foreground mb-4">Support & Inquiries</h2>
            <div className="space-y-4 text-xs font-semibold text-muted">
              <div>
                <span className="text-foreground block font-bold">Email Support:</span>
                <span>support@staytrack.in</span>
              </div>
              <div>
                <span className="text-foreground block font-bold">Host Onboarding Desk:</span>
                <span>hosts@staytrack.in</span>
              </div>
              <div>
                <span className="text-foreground block font-bold">Regional Service Area:</span>
                <span>Delhi NCR (Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, Faridabad)</span>
              </div>
              <div>
                <span className="text-foreground block font-bold">Support Hours:</span>
                <span>Monday – Saturday, 9:00 AM – 8:00 PM IST</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border border-border bg-surface">
            <h2 className="text-lg font-bold text-foreground mb-4">Send a Message</h2>
            <form className="space-y-3" action="#">
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">Email or Phone</label>
                <input
                  type="text"
                  placeholder="Enter email or phone number"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">Message</label>
                <textarea
                  rows={3}
                  placeholder="How can we help you?"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-[#111716] transition-all cursor-pointer"
              >
                Send Message
              </button>
            </form>
          </GlassCard>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
