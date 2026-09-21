import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50/80 backdrop-blur-xl py-12 text-zinc-600">
      <div className="mx-auto max-w-7xl px-6 grid gap-8 md:grid-cols-4">
        {/* Brand info */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white font-black text-sm">
              S
            </div>
            <span className="text-xl font-bold text-zinc-950">StayTrack</span>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Direct property booking platform connecting travelers, students, and professionals directly with hosts. Zero brokerage forever.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">Explore</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li><Link href="/search" className="hover:text-black transition-colors">Search Rooms & PGs</Link></li>
            <li><Link href="/search" className="hover:text-black transition-colors">Find Flats & Apartments</Link></li>
            <li><Link href="/search" className="hover:text-black transition-colors">Hourly Stays</Link></li>
            <li><Link href="/host" className="hover:text-black transition-colors">Become a Host</Link></li>
          </ul>
        </div>

        {/* Host Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">For Hosts</h4>
          <ul className="space-y-2 text-xs font-medium">
            <li><Link href="/host/apply" className="hover:text-black transition-colors">List Your Property</Link></li>
            <li><Link href="/host/dashboard" className="hover:text-black transition-colors">Host Dashboard</Link></li>
            <li><Link href="/host/properties" className="hover:text-black transition-colors">Property Manager Portal</Link></li>
          </ul>
        </div>

        {/* System & Support */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">Support & Status</h4>
          <div className="clay-card p-4 rounded-xl border border-zinc-200 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Backend API Active
            </div>
            <p className="text-[11px] text-zinc-500">
              Spring Boot microservice connected with Firebase Authentication.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 mt-8 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} StayTrack Inc. All rights reserved.</p>
        <div className="flex gap-4 mt-2 sm:mt-0 font-medium">
          <span className="hover:text-black cursor-pointer">Privacy</span>
          <span className="hover:text-black cursor-pointer">Terms</span>
          <span className="hover:text-black cursor-pointer">Security</span>
        </div>
      </div>
    </footer>
  );
}
