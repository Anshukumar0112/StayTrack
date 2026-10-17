"use client";

import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  MapPinIcon,
  MessageCircleIcon,
} from "@/components/ui/Icons";

export default function WhyStayTrack() {
  const editorialItems = [
    {
      num: "01",
      title: "Curated NCR Hubs",
      desc: "Verified stays across Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.",
      Icon: MapPinIcon,
    },
    {
      num: "02",
      title: "Direct Host Contact",
      desc: "Connect directly with property owners and managers through built-in chat messaging.",
      Icon: MessageCircleIcon,
    },
    {
      num: "03",
      title: "Flexible Living Models",
      desc: "Choose between hourly stays, daily getaways, or monthly accommodations.",
      Icon: CalendarDaysIcon,
    },
    {
      num: "04",
      title: "Verified Listing Review",
      desc: "Properties undergo structured host onboarding and administrative review for peace of mind.",
      Icon: BadgeCheckIcon,
    },
  ];

  return (
    <section className="stay-container py-12 sm:py-16 w-full border-t border-border/70">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Editorial Header */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block">
            Why StayTrack
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Stay somewhere that actually works for you.
          </h2>
          <p className="text-xs sm:text-sm text-muted font-normal leading-relaxed pt-1 max-w-sm">
            Built for transparent accommodation discovery across Delhi NCR with direct communication and flexible booking terms.
          </p>
        </div>

        {/* Right Editorial Numbered Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
          {editorialItems.map((item) => (
            <div key={item.num} className="group border-t border-border/70 pt-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-primary">
                  {item.num}
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-[#111716] group-hover:text-white transition-colors duration-200">
                  <item.Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                {item.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
