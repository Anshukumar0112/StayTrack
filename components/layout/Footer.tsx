import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#111716] text-white py-12 pb-24 md:pb-12 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid gap-10 md:grid-cols-4">
        {/* Brand Info */}
        <div className="space-y-3">
          <Link href="/" className="inline-block">
            <img
              src="/logo.png"
              alt="StayTrack"
              className="h-8 w-auto object-contain brightness-0 invert opacity-95"
            />
          </Link>
          <p className="text-xs leading-relaxed text-zinc-400 font-medium">
            India's direct property & stay marketplace connecting guests with verified hosts across Delhi NCR.
          </p>
        </div>

        {/* Explore Stays Column */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-3.5">
            Explore Stays
          </h4>
          <ul className="space-y-2 text-xs font-medium text-zinc-400">
            <li><Link href="/properties" className="hover:text-white transition-colors duration-200">All Properties</Link></li>
            <li><Link href="/properties?stayType=daily" className="hover:text-white transition-colors duration-200">Daily / Nightly Stays</Link></li>
            <li><Link href="/properties?stayType=monthly" className="hover:text-white transition-colors duration-200">Monthly Rentals & PGs</Link></li>
            <li><Link href="/properties?stayType=hourly" className="hover:text-white transition-colors duration-200">Hourly Transit Stays</Link></li>
          </ul>
        </div>

        {/* For Hosts Column */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-3.5">
            For Hosts
          </h4>
          <ul className="space-y-2 text-xs font-medium text-zinc-400">
            <li><Link href="/host/application" className="hover:text-white transition-colors duration-200">Become a Host</Link></li>
            <li><Link href="/host" className="hover:text-white transition-colors duration-200">Host Dashboard</Link></li>
            <li><Link href="/host/properties" className="hover:text-white transition-colors duration-200">Manage Properties</Link></li>
            <li><Link href="/host/subscription" className="hover:text-white transition-colors duration-200">Host Pro Subscription</Link></li>
          </ul>
        </div>

        {/* Platform Integrity Column */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-3.5">
            Platform Integrity
          </h4>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-xs shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-[#3F8A68] font-bold">
              <span className="h-2 w-2 rounded-full bg-[#3F8A68] animate-pulse" />
              Verified REST Engine
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              Spring Boot backend security & Razorpay payment integration.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 font-medium gap-3">
        <p>© {new Date().getFullYear()} StayTrack Platform. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/properties" className="hover:text-white transition-colors duration-200">Privacy Policy</Link>
          <Link href="/properties" className="hover:text-white transition-colors duration-200">Terms of Service</Link>
          <Link href="/host/application" className="hover:text-white transition-colors duration-200">List Property</Link>
        </div>
      </div>
    </footer>
  );
}
