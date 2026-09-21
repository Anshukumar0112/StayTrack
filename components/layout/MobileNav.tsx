"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";

export default function MobileNav() {
  const pathname = usePathname();
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  const role = userProfile?.role || "customer";

  const items = [
    { label: "Stays", icon: "🔍", path: "/properties" },
    { label: "Explore", icon: "🏠", path: "/" },
    { label: "Trips", icon: "🧳", path: "/trips" },
    { label: "Chat", icon: "💬", path: "/chat" },
  ];

  if (role === "host") {
    items.push({ label: "Host", icon: "🏢", path: "/host" });
  } else if (role === "admin") {
    items.push({ label: "Admin", icon: "⚙️", path: "/admin" });
  } else {
    items.push({ label: "Profile", icon: "👤", path: firebaseUser ? "/profile" : "/login" });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-zinc-200 py-2 px-3 shadow-lg">
      <div className="flex justify-around items-center">
        {items.map((item) => {
          const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-0.5 text-center transition-all ${
                isActive ? "text-black font-bold scale-105" : "text-zinc-500 font-medium hover:text-zinc-900"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
