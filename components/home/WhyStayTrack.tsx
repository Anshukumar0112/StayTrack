"use client";

import ClayCard from "@/components/ui/ClayCard";

export default function WhyStayTrack() {
  const features = [
    {
      icon: "🤝",
      title: "Direct Owner Contact",
      desc: "Chat directly with hosts before booking. No brokers, no hidden commission fees.",
    },
    {
      icon: "⏱️",
      title: "Flexible Stay Models",
      desc: "Choose between hourly transit slots, daily hotel stays, or monthly PG/Flat rentals.",
    },
    {
      icon: "💳",
      title: "Secure Payment Gateway",
      desc: "Razorpay integration ensures safe transactions directly routed to verified hosts.",
    },
    {
      icon: "🔍",
      title: "Verified Property Listings",
      desc: "Admin verification ensures listed photos, address, and amenities match reality.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 w-full">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-zinc-950">Why Choose StayTrack?</h2>
        <p className="text-xs sm:text-sm text-zinc-600 font-medium mt-2">
          Designed for Indian travelers, students, and working professionals seeking transparent accommodation.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <ClayCard key={i} className="p-6 text-center border border-zinc-200 hover:scale-[1.02] transition-transform">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="text-base font-bold text-zinc-950">{f.title}</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed font-medium">{f.desc}</p>
          </ClayCard>
        ))}
      </div>
    </section>
  );
}
