"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import {
  Building2Icon,
  CalendarDaysIcon,
  CompassIcon,
  CrownIcon,
  MessageCircleIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/Icons";

export default function MobileNav() {
  const pathname = usePathname();
  const { user: firebaseUser } = useAuth();
  const { user: userProfile } = useUser();

  const role = userProfile?.role || "customer";

  const bookingsPath = firebaseUser ? "/trips" : "/auth?mode=login&returnTo=/trips";

  const items = [
    { label: "Explore", icon: CompassIcon, path: "/" },
    { label: "Stays", icon: SearchIcon, path: "/properties" },
    { label: "Bookings", icon: CalendarDaysIcon, path: bookingsPath },
    ...(firebaseUser ? [{ label: "Chat", icon: MessageCircleIcon, path: "/chat" }] : []),
  ];

  if (role === "host") {
    items.push({ label: "Host", icon: Building2Icon, path: "/host" });
  } else if (role === "admin") {
    items.push({ label: "Admin", icon: CrownIcon, path: "/admin" });
  } else {
    const loginHref = pathname && pathname !== "/" ? `/auth?mode=login&returnTo=${encodeURIComponent(pathname)}` : "/auth?mode=login";
    items.push({ label: firebaseUser ? "Profile" : "Login", icon: UserIcon, path: firebaseUser ? "/profile" : loginHref });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] px-3 shadow-lg select-none">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 gap-1 text-center transition-all cursor-pointer ${
                isActive ? "text-primary font-extrabold scale-105" : "text-muted font-semibold hover:text-foreground"
              }`}
            >
              <IconComponent className="w-5 h-5 stroke-[1.8]" />
              <span className="text-[10px] tracking-tight leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
