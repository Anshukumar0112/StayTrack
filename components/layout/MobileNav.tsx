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
  const isHost = Boolean(firebaseUser && role === "host");
  const isAdmin = Boolean(firebaseUser && role === "admin");

  const bookingsLabel = isHost ? "Guest Bookings" : "My Bookings";
  const bookingsPath = isHost
    ? "/host/bookings"
    : firebaseUser
    ? "/trips"
    : "/auth?mode=login&returnTo=/trips";

  const items = [
    { label: "Explore", icon: CompassIcon, path: "/" },
    { label: "Stays", icon: SearchIcon, path: "/properties" },
    { label: bookingsLabel, icon: CalendarDaysIcon, path: bookingsPath },
    ...(firebaseUser ? [{ label: "Chat", icon: MessageCircleIcon, path: "/chat" }] : []),
  ];

  if (isHost) {
    items.push({ label: "Host", icon: Building2Icon, path: "/host" });
  } else if (isAdmin) {
    items.push({ label: "Admin", icon: CrownIcon, path: "/admin" });
  } else {
    const loginHref =
      pathname && pathname !== "/"
        ? `/auth?mode=login&returnTo=${encodeURIComponent(pathname)}`
        : "/auth?mode=login";
    items.push({
      label: firebaseUser ? "Profile" : "Login",
      icon: UserIcon,
      path: firebaseUser ? "/profile" : loginHref,
    });
  }

  const checkIsActive = (itemPath: string) => {
    if (itemPath === "/") {
      return pathname === "/";
    }
    if (itemPath === "/properties") {
      return pathname.startsWith("/properties") || pathname.startsWith("/stays");
    }
    if (itemPath === "/host/bookings") {
      return pathname.startsWith("/host/bookings");
    }
    if (itemPath === "/trips" || itemPath.startsWith("/auth?mode=login&returnTo=/trips")) {
      return pathname.startsWith("/trips") || pathname.startsWith("/booking");
    }
    if (itemPath === "/chat") {
      return pathname.startsWith("/chat");
    }
    if (itemPath === "/host") {
      return pathname === "/host" || (pathname.startsWith("/host") && !pathname.startsWith("/host/bookings"));
    }
    if (itemPath === "/admin") {
      return pathname.startsWith("/admin");
    }
    if (itemPath === "/profile") {
      return pathname.startsWith("/profile");
    }
    return pathname === itemPath;
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-surface/95 backdrop-blur-md border-t border-border pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] px-2 shadow-elevated select-none"
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        {items.map((item) => {
          const isActive = checkIsActive(item.path);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.label}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-1 rounded-lg text-center transition-all cursor-pointer group ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted font-medium hover:text-foreground"
              }`}
            >
              <IconComponent
                className={`w-5 h-5 transition-transform ${
                  isActive ? "stroke-[2.2] scale-105" : "stroke-[1.8] group-hover:scale-105"
                }`}
              />
              <span className={`text-[10px] tracking-tight leading-none mt-1 ${isActive ? "text-foreground font-semibold" : "text-muted font-medium"}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-primary mt-0.5 animate-in fade-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

