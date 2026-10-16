"use client";

import ClayCard from "@/components/ui/ClayCard";

export default function WhyStayTrack() {
  const editorialItems = [
    {
      num: "01",
      title: "Verified stays",
      desc: "Know what you're booking before you arrive.",
      icon: "/icons/shield-check.png",
    },
    {
      num: "02",
      title: "Direct owner contact",
      desc: "Talk directly with the person managing your stay.",
      icon: "/icons/handshake.png",
    },
    {
      num: "03",
      title: "Flexible living",
      desc: "Hourly, daily and monthly options.",
      icon: "/icons/clock.png",
    },
    {
      num: "04",
      title: "Secure booking",
      desc: "Safe payments and transparent booking status.",
      icon: "/icons/credit-card.png",
    },
  ];

  return (
    <section className="stay-container fluid-section-spacing w-full border-t border-border/60">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Editorial Header */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-3">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block">
            WHY STAYTRACK
          </span>
          <h2 className="fluid-heading-section font-black text-[#111716]">
            Stay somewhere that actually works for you.
          </h2>
          <p className="text-xs sm:text-sm text-muted font-medium leading-relaxed pt-1">
            Built for transparent accommodations across Delhi NCR with direct host connection and zero middleman markup.
          </p>
        </div>

        {/* Right Editorial Numbered Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
          {editorialItems.map((item) => (
            <div key={item.num} className="group border-t border-border/70 pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black font-mono text-primary group-hover:text-[#111716] transition-colors duration-200">
                  {item.num}
                </span>
                <img src={item.icon} alt="" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#111716]">
                {item.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed font-medium">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
