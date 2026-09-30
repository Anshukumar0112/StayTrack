"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useAdminGuard() {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminStatus() {
      if (pathname === "/admin/login") {
        setLoading(false);
        return;
      }

      // Check HTTP-only Dedicated Admin Server Session strictly
      try {
        const sessionRes = await fetch("/api/admin/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.authenticated) {
            if (typeof window !== "undefined" && sessionData.adminToken) {
              sessionStorage.setItem("staytrack_admin_token", sessionData.adminToken);
            }
            setIsAdmin(true);
            setAdminId(sessionData.adminId || "admin");
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Session verification failed
      }

      // Unauthorized dedicated admin session -> Clear state & redirect to Admin Login
      setIsAdmin(false);
      setAdminId(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("staytrack_admin_token");
      }
      setLoading(false);
      router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`);
    }

    checkAdminStatus();
  }, [pathname, router]);

  return { isAdmin, adminId, loading };
}
