"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getCurrentUser } from "@/lib/api";
import { User } from "@/lib/types";

export function useAuthGuard() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const token = await user.getIdToken();
          const profile = await getCurrentUser(token);
          setUserProfile(profile);
        } catch (error) {
          console.warn("Failed to load user profile:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Action guard that checks if the user is authenticated.
   * If logged in, proceeds to `targetPath` or executes callback.
   * If NOT logged in, redirects to `/login` with target return URL and role intent.
   */
  function handleProtectedAction(
    targetPath: string,
    roleIntent: "customer" | "host" | "admin" = "customer",
    onSuccess?: () => void
  ) {
    if (firebaseUser && userProfile) {
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(targetPath);
      }
      return true;
    }

    // User is unauthenticated -> redirect to /login with target return URL
    const encodedRedirect = encodeURIComponent(targetPath);
    router.push(`/login?redirect=${encodedRedirect}&role=${roleIntent}`);
    return false;
  }

  return {
    firebaseUser,
    userProfile,
    loading,
    isAuthenticated: !!firebaseUser && !!userProfile,
    handleProtectedAction,
  };
}
