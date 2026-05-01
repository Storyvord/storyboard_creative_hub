"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Editorial 404. Reuses landing tokens (.lp scope) loaded globally via
// app/layout.tsx → landing.css.
export default function NotFound() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuthed(!!localStorage.getItem("accessToken"));
  }, []);

  return (
    <div className="lp" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "10vh 6vw" }}>
      <div className="lp-grain" aria-hidden />

      <main style={{ position: "relative", zIndex: 2, maxWidth: 880, width: "100%" }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lp-scene-no"
          style={{ marginBottom: 40 }}
        >
          SC. — / TAKE 00 / NO GOOD
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.77, 0, 0.175, 1] }}
          className="display"
          style={{
            fontSize: "clamp(6rem, 22vw, 18rem)",
            margin: 0,
            lineHeight: 0.85,
            color: "var(--paper)",
            letterSpacing: "-0.02em",
          }}
        >
          4<em style={{ color: "var(--blood)", fontStyle: "italic" }}>0</em>4
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28 }}
        >
          <span style={{ width: 80, height: 1, background: "var(--blood)" }} aria-hidden />
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.32em", color: "var(--silver)", textTransform: "uppercase" }}>
            Scene not found
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="serif"
          style={{
            fontStyle: "italic",
            fontSize: "clamp(1.4rem, 2.6vw, 2rem)",
            color: "var(--paper)",
            margin: "32px 0 12px",
            maxWidth: "30ch",
            lineHeight: 1.25,
          }}
        >
          This take didn’t make the final cut.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          style={{ color: "var(--paper)", opacity: 0.7, fontSize: 15, lineHeight: 1.6, maxWidth: "44ch", margin: "0 0 40px" }}
        >
          The page you were looking for either wrapped early, was left on the cutting-room floor, or never made it out of pre-production.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease: [0.77, 0, 0.175, 1] }}
          style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}
        >
          <Link href={authed ? "/dashboard" : "/"} className="lp-cta">
            {authed ? "Back to set" : "Back to title card"}
            <span aria-hidden>→</span>
          </Link>
          {!authed && (
            <Link href="/login" className="lp-cta lp-cta-ghost">
              Sign in
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mono"
          style={{
            marginTop: 64,
            fontSize: 10,
            letterSpacing: "0.32em",
            color: "var(--silver)",
            textTransform: "uppercase",
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--rule)",
            paddingTop: 18,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>STORYVORD · END SLATE</span>
          <span>ERR · 404 · ROUTE_NOT_FOUND</span>
        </motion.div>
      </main>
    </div>
  );
}
