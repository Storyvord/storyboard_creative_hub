"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Client-side auth guard. Checks localStorage.accessToken on mount;
 * if missing, redirects to /login. Renders a centered loader while checking
 * so unauthenticated content never flashes on screen.
 *
 * Storyvord stores tokens in localStorage (not cookies), so middleware cannot
 * perform this check — gate at the component level instead.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          color: "var(--text-muted)",
        }}
      >
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
