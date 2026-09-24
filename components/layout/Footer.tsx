import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50/90 py-12 text-zinc-600 pb-20 md:pb-12">
      <div className="mx-auto max-w-7xl px-6 grid gap-8 md:grid-cols-4">
        {/* Brand info */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white font-black text-sm">
              S
            </div>
            <span className="text-xl font-black tracking-tight text-zinc-950">STAYTRACK</span>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            India's direct property/stay marketplace connecting customers directly with hosts. Hourly, daily, and monthly stays across Delhi NCR.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">Explore Stays</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li><Link href="/properties" className="hover:text-black transition-colors">All Properties</Link></li>
            <li><Link href="/properties?stayType=daily" className="hover:text-black transition-colors">Daily / Nightly Stays</Link></li>
            <li><Link href="/properties?stayType=monthly" className="hover:text-black transition-colors">Monthly Rentals & PGs</Link></li>
            <li><Link href="/properties?stayType=hourly" className="hover:text-black transition-colors">Hourly Stays</Link></li>
          </ul>
        </div>

        {/* Host Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">For Hosts</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li><Link href="/host/application" className="hover:text-black transition-colors">Become a Host</Link></li>
            <li><Link href="/host" className="hover:text-black transition-colors">Host Dashboard</Link></li>
            <li><Link href="/host/properties" className="hover:text-black transition-colors">Manage Properties</Link></li>
            <li><Link href="/host/subscription" className="hover:text-black transition-colors">Host Subscriptions</Link></li>
          </ul>
        </div>

        {/* System & Support */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">Platform Integrity</h4>
          <div className="p-4 rounded-xl border border-zinc-200 bg-white text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Spring Boot + Firebase Active
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Verified REST backend API & Razorpay payment integration.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 mt-8 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} StayTrack Platform. All rights reserved.</p>
        <div className="flex gap-4 mt-2 sm:mt-0 font-medium">
          <Link href="/properties" className="hover:text-black">Privacy Policy</Link>
          <Link href="/properties" className="hover:text-black">Terms of Service</Link>
          <Link href="/host/application" className="hover:text-black">List Property</Link>
        </div>
      </div>
    </footer>
  );
}
