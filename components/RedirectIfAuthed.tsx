"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Inverse of RequireAuth. If an access token is present, redirect away from
 * the wrapped page (login / register) to the in-app destination.
 */
export default function RedirectIfAuthed({
  to = "/dashboard",
  children,
}: {
  to?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("accessToken")) {
      router.replace(to);
      return;
    }
    setReady(true);
  }, [router, to]);

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
