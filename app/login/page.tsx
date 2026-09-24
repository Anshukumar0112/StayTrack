"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", "login");
    router.replace(`/auth?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-xs font-bold text-zinc-500">
      Redirecting to StayTrack Login...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-xs font-bold text-zinc-500">
          Loading...
        </div>
      }
    >
      <LoginRedirectContent />
    </Suspense>
  );
}