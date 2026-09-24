"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAdminSummary } from "@/lib/api";

export function useAdminGuard() {
  const router = useRouter();
  const pathname = usePathname();

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      if (pathname === "/admin/login") {
        setLoading(false);
        return;
      }

      // 1. Check HTTP-only Server Admin Session
      try {
        const sessionRes = await fetch("/api/admin/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.authenticated) {
            setIsAdmin(true);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Session check failed, continue to Firebase Auth check fallback
      }

      // 2. Fallback to Firebase Auth check
      const user = auth.currentUser;
      if (user) {
        setFirebaseUser(user);
        try {
          await getAdminSummary();
          setIsAdmin(true);
          setLoading(false);
          return;
        } catch (err) {
          console.warn("Admin backend check notice:", err);
        }
      }

      // 3. Unauthorized -> Redirect to Admin Login
      setIsAdmin(false);
      setLoading(false);
      router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`);
    }

    const unsubscribe = onAuthStateChanged(auth, () => {
      checkAdminStatus();
    });

    checkAdminStatus();

    return () => unsubscribe();
  }, [pathname, router]);

  return { firebaseUser, isAdmin, loading };
}
