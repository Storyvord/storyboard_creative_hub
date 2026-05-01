"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────
// Storyvord landing — black editorial theme, AI Co-Producer brand DNA.
// Strict palette: ink / paper / brand / silver. No gradients.
// Animation = hard cuts, masks, develops, marquees. No glow blobs.
// Copy is brand-aligned to dev.storyvord.io: AI Co-Producer positioning,
// real feature names, real pricing tiers, brand CTAs (Start For Free).
// ─────────────────────────────────────────────────────────────────────

const SCENES = [
  {
    no: "01",
    slug: "INT. SCRIPT ROOM — DAY",
    title: "AI Script Breakdown.",
    body:
      "Drop a screenplay. Storyvord auto-tags every character, location, prop, and scene requirement — the kind of work that used to eat a week of an AD's life.",
    shotlist: ["Auto-tagged scenes", "Character & prop index", "Location lookup", "Page-count math"],
    image: "/screenshots/script.png",
  },
  {
    no: "02",
    slug: "INT. ART DEPARTMENT — DAY",
    title: "The Creative Hub.",
    body:
      "Storyvord's flagship feature. Script, Scenes, Characters, Locations, Wardrobe and Storyboard — the entire art department in one workspace, every module linked back to your script.",
    shotlist: ["Script", "Scenes", "Characters", "Locations", "Wardrobe", "Storyboard"],
    image: "/screenshots/dashboard.png",
  },
  {
    no: "03",
    slug: "INT. ART DEPARTMENT — DAY",
    title: "AI Storyboard Generation.",
    body:
      "Shot-by-shot storyboards drawn by AI. Three styles — anime, cinematic, sketch. Run a slideshow of the whole sequence before a single frame is shot.",
    shotlist: ["Shot-by-shot panels", "Style switcher", "Slideshow preview", "Frame export"],
    image: "/screenshots/storyboard.png",
  },
  {
    no: "04",
    slug: "INT. PROD OFFICE — DAY",
    title: "AI Project Management.",
    body:
      "Kanban across departments — To Do, In Progress, On Hold, Done. Assign, prioritise, due dates. The status meeting writes itself.",
    shotlist: ["Department lanes", "Assignees", "Priorities", "Due dates"],
    image: "/screenshots/tasks.png",
  },
  {
    no: "05",
    slug: "INT. UNIT BASE — NIGHT",
    title: "AI Call Sheets.",
    body:
      "Generate, distribute, get acknowledgements. Cast and crew receive auto-notifications. No more PDF email chains.",
    shotlist: ["Auto-generated", "Cast & crew alerts", "Acknowledgements", "Version history"],
    image: "/screenshots/callsheets.png",
  },
  {
    no: "06",
    slug: "INT. PRODUCER'S OFFICE — DAY",
    title: "AI Budget & Compliance.",
    body:
      "Budget breakdown, logistics, sustainability and global film-compliance reports — generated at a click. Numbers that survive the audit.",
    shotlist: ["Budget breakdown", "Sustainability", "Global compliance", "Logistics plan"],
    image: "/screenshots/reports.png",
  },
  {
    no: "07",
    slug: "INT. CASTING — DAY",
    title: "AI Crew & Casting.",
    body:
      "Reference portraits, per-scene looks, AI-suggested crew matched to your project's shape. Continuity that survives the schedule.",
    shotlist: ["Reference portrait", "Per-scene looks", "Continuity log", "Crew matches"],
    image: "/screenshots/anna-detail.png",
  },
];

const SHOT_LIST = [
  { num: "1.", phase: "Pre-production", body: "Script in. Breakdown out. Storyboards drawn. Locations scouted. Crew called." },
  { num: "2.", phase: "Production",     body: "Slate up. Cameras roll. Call sheets distributed. Daily status without the daily meeting." },
  { num: "3.", phase: "Post",           body: "Cut, colour, sound, notes. Reviews with timecodes. Approvals without screenshots in Slack." },
  { num: "4.", phase: "Delivery",       body: "Cut master. Festival kits. Distributor handoff. Wrap." },
];

const PRICING = [
  {
    tier: "Indie",
    price: "$7,600",
    cadence: "/ year",
    pitch: "For solo filmmakers and small teams shooting independent features and shorts.",
    includes: [
      "Up to 3 active projects",
      "AI script breakdown",
      "AI storyboard generation",
      "Call sheets · Project board",
      "Email support",
    ],
    cta: { label: "Start for free", href: "/register" },
    popular: false,
  },
  {
    tier: "Studio",
    price: "$47,600",
    cadence: "/ year",
    pitch: "For working production companies running multiple projects in parallel.",
    includes: [
      "Unlimited projects",
      "Everything in Indie",
      "AI budget · sustainability · compliance",
      "AI crew suggestions",
      "Priority support",
    ],
    cta: { label: "Get studio access", href: "/register" },
    popular: true,
  },
  {
    tier: "Oscar",
    price: "Custom",
    cadence: "Enterprise",
    pitch: "For studios, networks, and broadcasters with custom needs.",
    includes: [
      "Multi-org workspaces",
      "SSO · custom roles",
      "Dedicated success manager",
      "VPC / on-prem option",
      "Service-level agreement",
    ],
    cta: { label: "Talk to us", href: "mailto:hello@storyvord.io" },
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="lp">
      <Grain />
      <TopBar />
      <Timecode />
      <TitleCard />
      <Marquee />
      <Logline />
      <Breakdown />
      <Reel scenes={SCENES} />
      <ShotList rows={SHOT_LIST} />
      <Pricing tiers={PRICING} />
      <Cast />
      <Wrap />
      <EndCredits />
    </div>
  );
}

// ── Sticky top bar with auth-aware CTAs ────────────────────────────

function TopBar() {
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuthed(!!window.localStorage.getItem("accessToken"));
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkStyle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "var(--paper)",
  };

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.77, 0, 0.175, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 6vw",
        background: scrolled ? "var(--ink)" : "transparent",
        borderBottom: `1px solid ${scrolled ? "var(--rule)" : "transparent"}`,
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}
    >
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 14 }}>
        <Image
          src="/storyvord/logo.svg"
          alt="Storyvord"
          width={120}
          height={40}
          priority
          style={{ height: 32, width: "auto" }}
        />
        <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.7, fontSize: 9, letterSpacing: "0.32em", color: "var(--paper)", textTransform: "uppercase", borderLeft: "1px solid var(--rule)", paddingLeft: 14 }}>
          <Image src="/storyvord/icons_ai.svg" alt="" width={14} height={14} style={{ filter: "invert(1)" }} />
          AI Co-Producer
        </span>
      </Link>

      <nav className="mono" style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Link href="#features" className="lp-link" style={linkStyle}>Features</Link>
        <Link href="#process" className="lp-link" style={linkStyle}>Process</Link>
        <Link href="#pricing" className="lp-link" style={linkStyle}>Pricing</Link>
        <Link href="#contact" className="lp-link" style={linkStyle}>Contact</Link>
        <span style={{ width: 1, height: 16, background: "var(--rule)", margin: "0 4px" }} aria-hidden />
        {authed ? (
          <Link href="/dashboard" className="lp-cta" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.22em" }}>
            Dashboard <span aria-hidden>→</span>
          </Link>
        ) : (
          <>
            <Link href="/login" className="lp-link" style={linkStyle}>Log in</Link>
            <Link href="/register" className="lp-cta" style={{ padding: "10px 18px", fontSize: 11, letterSpacing: "0.22em" }}>
              Start for free <span aria-hidden>→</span>
            </Link>
          </>
        )}
      </nav>
    </motion.header>
  );
}

// ── Persistent overlays ────────────────────────────────────────────

function Grain() {
  return <div className="lp-grain" aria-hidden />;
}

function Timecode() {
  const [tc, setTc] = useState("00:00:00:00");
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const totalFrames = Math.floor(elapsed * 24);
      const ff = totalFrames % 24;
      const ss = Math.floor(totalFrames / 24) % 60;
      const mm = Math.floor(totalFrames / (24 * 60)) % 60;
      const hh = Math.floor(totalFrames / (24 * 60 * 60));
      const pad = (n: number) => n.toString().padStart(2, "0");
      setTc(`${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`);
    }, 1000 / 12);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="lp-tc" aria-hidden>
      <span className="dot" />
      <span>REC · {tc}</span>
      <span style={{ opacity: 0.5 }}>STORYVORD · TAKE 01</span>
    </div>
  );
}

// ── Title card / hero ──────────────────────────────────────────────

function TitleCard() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} style={{ position: "relative", minHeight: "100vh", padding: "14vh 6vw 8vh", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
      {/* Brand curve — Storyvord's signature decorative arc */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ duration: 2.4, delay: 1.2, ease: [0.77, 0, 0.175, 1] }}
        style={{
          position: "absolute",
          right: "-8vw",
          top: "12vh",
          width: "60vw",
          maxWidth: 760,
          aspectRatio: "572 / 458",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      >
        <Image
          src="/storyvord/landing-page_aiSimplifies_curve.svg"
          alt=""
          fill
          style={{ objectFit: "contain" }}
        />
      </motion.div>

      {/* Title block */}
      <motion.div style={{ y, opacity, marginTop: "4vh", position: "relative", zIndex: 2 }}>
        <motion.div
          className="caps"
          style={{ color: "var(--silver)", marginBottom: 22 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          AI CO-PRODUCER ·  BUILT FOR MODERN FILMMAKERS ·  RUNTIME: 0:00 → ∞
        </motion.div>

        <h1
          className="display"
          style={{
            fontSize: "clamp(3rem, 9vw, 9.5rem)",
            margin: "0 0 28px",
            color: "var(--paper)",
            maxWidth: "18ch",
          }}
        >
          {"Insights that ".split("").map((c, i) => (
            <ClipChar key={`a-${i}`} delay={0.5 + i * 0.025} char={c} />
          ))}
          <em style={{ color: "var(--brand)", fontStyle: "italic" }}>
            {"simplify".split("").map((c, i) => (
              <ClipChar key={`b-${i}`} delay={0.85 + i * 0.04} char={c} />
            ))}
          </em>
          {" production.".split("").map((c, i) => (
            <ClipChar key={`c-${i}`} delay={1.2 + i * 0.025} char={c} />
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          style={{ maxWidth: "48ch", fontSize: "clamp(1rem, 1.4vw, 1.2rem)", lineHeight: 1.6, color: "var(--paper)", opacity: 0.82, margin: 0 }}
        >
          An AI co-producer for modern filmmakers. Planning, budgeting, compliance, sustainability, scripts and storyboards — bringing human creativity and AI together in one production platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.9, ease: [0.77, 0, 0.175, 1] }}
          style={{ marginTop: 44, display: "flex", gap: 16, flexWrap: "wrap" }}
        >
          <Link href="/register" className="lp-cta">
            Start for free
            <Image src="/storyvord/landing-page_startForFreeIcon.svg" alt="" width={16} height={16} aria-hidden />
          </Link>
          <Link href="#features" className="lp-cta lp-cta-ghost">Watch demo</Link>
        </motion.div>
      </motion.div>

      {/* Bottom slate row */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 80 }}
        className="caps"
      >
        <div style={{ color: "var(--silver)" }}>SC. 01<br /><span style={{ color: "var(--paper)" }}>TAKE 01</span></div>
        <div style={{ color: "var(--silver)", textAlign: "center" }}>
          <span style={{ display: "inline-block", width: 1, height: 60, background: "var(--silver)", marginBottom: 12 }} />
          <br />SCROLL
        </div>
        <div style={{ color: "var(--silver)", textAlign: "right" }}>DIR.<br /><span style={{ color: "var(--paper)" }}>YOU</span></div>
      </motion.footer>
    </section>
  );
}

function ClipChar({ char, delay }: { char: string; delay: number }) {
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
      <motion.span
        style={{ display: "inline-block" }}
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.7, delay, ease: [0.77, 0, 0.175, 1] }}
      >
        {char === " " ? " " : char}
      </motion.span>
    </span>
  );
}

// ── Marquee ────────────────────────────────────────────────────────

function Marquee() {
  return (
    <section style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", padding: "32px 0", overflow: "hidden" }} aria-hidden>
      <div className="lp-marquee">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="serif" style={{ fontStyle: "italic" }}>
            AI Script Breakdown ✦ Creative Hub ✦ AI Storyboard ✦ AI Call Sheets ✦ AI Project Management ✦ AI Budget ✦ AI Compliance ✦ AI Crew ✦
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Logline ────────────────────────────────────────────────────────

function Logline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  return (
    <section style={{ padding: "16vh 8vw", maxWidth: 1200, margin: "0 auto" }}>
      <div ref={ref}>
        <div className="lp-scene-no" style={{ marginBottom: 48 }}>LOGLINE</div>
        <p className="lp-quote" style={{ color: "var(--paper)", margin: 0, maxWidth: "26ch" }}>
          {"AI that supports human collaboration — not replaces it.".split(" ").map((w, i) => (
            <motion.span
              key={i}
              style={{ display: "inline-block", marginRight: "0.32em" }}
              initial={{ opacity: 0, y: "100%" }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.77, 0, 0.175, 1] }}
            >
              {w}
            </motion.span>
          ))}
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 1 }}
          className="mono"
          style={{ marginTop: 36, color: "var(--silver)", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase" }}
        >
          — The Storyvord Co-Producer manifesto
        </motion.p>
      </div>
    </section>
  );
}

// ── Breakdown — three stark stats ──────────────────────────────────

function Breakdown() {
  const stats = [
    { num: "80%", label: "Less time on script breakdown.", caption: "AI parses every scene in seconds — characters, props, locations." },
    { num: "06", label: "Modules in the Creative Hub.", caption: "Script · Scenes · Characters · Locations · Wardrobe · Storyboard." },
    { num: "00", label: "Apps you switch between.", caption: "Human creativity in. Tab-juggling out. That's the entire pitch." },
  ];
  return (
    <section style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", padding: "12vh 6vw" }}>
      <div className="lp-scene-no" style={{ marginBottom: 60 }}>THE BREAKDOWN</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10vh 6vw" }}>
        {stats.map((s, i) => (
          <Stat key={s.num} {...s} index={i} />
        ))}
      </div>
    </section>
  );
}

function Stat({ num, label, caption, index }: { num: string; label: string; caption: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.18, ease: [0.77, 0, 0.175, 1] }}
    >
      <span className="lp-stat-num">{num}</span>
      <p className="serif" style={{ fontStyle: "italic", fontSize: "1.4rem", margin: "16px 0 8px", maxWidth: "16ch", color: "var(--paper)" }}>{label}</p>
      <p className="mono" style={{ fontSize: 12, color: "var(--silver)", letterSpacing: "0.06em", maxWidth: "32ch", lineHeight: 1.6, margin: 0 }}>{caption}</p>
    </motion.div>
  );
}

// ── The Reel — feature scenes ──────────────────────────────────────

function Reel({ scenes }: { scenes: typeof SCENES }) {
  return (
    <section id="features" style={{ padding: "16vh 6vw", display: "flex", flexDirection: "column", gap: "14vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24, marginBottom: 24 }}>
        <h2 className="display" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", margin: 0, color: "var(--paper)", maxWidth: "14ch" }}>
          The reel.
        </h2>
        <p className="mono" style={{ color: "var(--silver)", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", maxWidth: "32ch", lineHeight: 1.6 }}>
          The Creative Hub plus six AI tools, built for the way a set actually works.
        </p>
      </header>
      {scenes.map((s, i) => (
        <SceneRow key={s.no} scene={s} index={i} />
      ))}
    </section>
  );
}

function SceneRow({ scene, index }: { scene: typeof SCENES[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const flipped = index % 2 === 1;
  return (
    <article
      ref={ref}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
        gap: "5vw",
        alignItems: "center",
        direction: flipped ? "rtl" : "ltr",
      }}
    >
      <div style={{ direction: "ltr" }}>
        <div className={`lp-still-frame ${inView ? "open" : ""}`} style={{ aspectRatio: "16 / 10" }}>
          <div className={`lp-stillframe ${inView ? "developed" : ""}`} style={{ position: "absolute", inset: 0 }}>
            <Image
              src={scene.image}
              alt={scene.title}
              fill
              sizes="(max-width: 900px) 100vw, 60vw"
              style={{ objectFit: "cover" }}
              priority={index < 2}
            />
          </div>
          {/* Slate sticker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mono"
            style={{
              position: "absolute",
              top: 16, left: 16,
              background: "var(--paper)",
              color: "var(--ink)",
              padding: "4px 10px",
              fontSize: 10,
              letterSpacing: "0.18em",
              zIndex: 3,
            }}
          >
            SC. {scene.no} · TAKE 01
          </motion.div>
        </div>
      </div>

      <div style={{ direction: "ltr" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.77, 0, 0.175, 1] }}
        >
          <div className="lp-scene-no" style={{ marginBottom: 24 }}>SC. {scene.no}  ·  {scene.slug}</div>
          <h3 className="display" style={{ fontSize: "clamp(2rem, 4.4vw, 3.6rem)", margin: "0 0 22px", color: "var(--paper)", maxWidth: "18ch", fontStyle: "italic" }}>
            {scene.title}
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--paper)", opacity: 0.78, margin: "0 0 24px", maxWidth: "44ch" }}>
            {scene.body}
          </p>
          <ul className="mono" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--paper)" }}>
            {scene.shotlist.map((b) => (
              <li key={b} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, background: "var(--brand)", display: "inline-block", flexShrink: 0 }} />
                {b}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </article>
  );
}

// ── Shot list (process) ────────────────────────────────────────────

function ShotList({ rows }: { rows: typeof SHOT_LIST }) {
  return (
    <section id="process" style={{ padding: "16vh 6vw", maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24, marginBottom: 64 }}>
        <h2 className="display" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", margin: 0, color: "var(--paper)", maxWidth: "14ch" }}>
          A shot list, not a sales deck.
        </h2>
        <p className="mono" style={{ color: "var(--silver)", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", maxWidth: "30ch", lineHeight: 1.6 }}>
          Four phases. One AI co-producer. No tab juggling.
        </p>
      </header>
      <div>
        {rows.map((r, i) => (
          <ShotRow key={r.num} {...r} index={i} />
        ))}
      </div>
    </section>
  );
}

function ShotRow({ num, phase, body, index }: { num: string; phase: string; body: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <motion.div
      ref={ref}
      className="lp-shot-row"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.77, 0, 0.175, 1] }}
    >
      <span className="num">{num}</span>
      <span className="phase">{phase}</span>
      <span className="body">{body}</span>
    </motion.div>
  );
}

// ── Pricing ────────────────────────────────────────────────────────

function Pricing({ tiers }: { tiers: typeof PRICING }) {
  return (
    <section id="pricing" style={{ borderTop: "1px solid var(--rule)", padding: "16vh 6vw" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24, marginBottom: 80 }}>
        <h2 className="display" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", margin: 0, color: "var(--paper)", maxWidth: "14ch" }}>
          Pick your <em style={{ color: "var(--brand)" }}>budget.</em>
        </h2>
        <p className="mono" style={{ color: "var(--silver)", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", maxWidth: "32ch", lineHeight: 1.6 }}>
          Three tiers. Annual billing. No hidden fees.
        </p>
      </header>
      <div className="lp-pricing-grid">
        {tiers.map((t, i) => (
          <PriceCard key={t.tier} tier={t} index={i} />
        ))}
      </div>
    </section>
  );
}

function PriceCard({ tier, index }: { tier: typeof PRICING[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  return (
    <motion.div
      ref={ref}
      className={`lp-price ${tier.popular ? "popular" : ""}`}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.15, ease: [0.77, 0, 0.175, 1] }}
    >
      {tier.popular && (
        <span className="lp-price-badge mono">★ POPULAR</span>
      )}
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.32em", color: "var(--silver)", textTransform: "uppercase", marginBottom: 22 }}>
        {tier.tier} Package
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 22 }}>
        <span className="display" style={{ fontSize: "clamp(2.6rem, 5.2vw, 4.2rem)", color: "var(--paper)", fontStyle: "italic" }}>
          {tier.price}
        </span>
        <span className="mono" style={{ color: "var(--silver)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {tier.cadence}
        </span>
      </div>

      <p className="serif" style={{ fontStyle: "italic", color: "var(--paper)", opacity: 0.82, fontSize: "1.05rem", lineHeight: 1.5, margin: "0 0 28px", maxWidth: "30ch" }}>
        {tier.pitch}
      </p>

      <ul className="mono" style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 12, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--paper)" }}>
        {tier.includes.map((f) => (
          <li key={f} style={{ display: "flex", gap: 12, alignItems: "center", borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
            <span style={{ width: 6, height: 6, background: tier.popular ? "var(--brand)" : "var(--paper)", display: "inline-block", flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={tier.cta.href}
        className={`lp-cta ${tier.popular ? "" : "lp-cta-ghost"}`}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {tier.cta.label} <span aria-hidden>→</span>
      </Link>
    </motion.div>
  );
}

// ── Cast (testimonials as pull quotes) ─────────────────────────────

function Cast() {
  const quotes = [
    { q: "It cut three days out of pre-production. We onboarded the AD in an afternoon.", who: "Producer", credit: "FALSE LAUREL (2025)" },
    { q: "The AI breakdown caught two location conflicts I'd have missed at 2am.", who: "1st AD", credit: "DUNE GRASS (2024)" },
  ];
  return (
    <section id="cast" style={{ padding: "16vh 6vw", borderTop: "1px solid var(--rule)" }}>
      <div className="lp-scene-no" style={{ marginBottom: 48 }}>CAST</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "10vh 6vw" }}>
        {quotes.map((q, i) => (
          <CastQuote key={i} {...q} index={i} />
        ))}
      </div>
    </section>
  );
}

function CastQuote({ q, who, credit, index }: { q: string; who: string; credit: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  return (
    <motion.figure
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.2, ease: [0.77, 0, 0.175, 1] }}
      style={{ margin: 0, borderTop: "1px solid var(--brand)", paddingTop: 28 }}
    >
      <blockquote className="lp-quote" style={{ color: "var(--paper)", margin: 0, maxWidth: "22ch" }}>
        {q}
      </blockquote>
      <figcaption className="mono" style={{ marginTop: 28, fontSize: 12, letterSpacing: "0.18em", color: "var(--silver)", textTransform: "uppercase" }}>
        — {who} · <span style={{ color: "var(--paper)" }}>{credit}</span>
      </figcaption>
    </motion.figure>
  );
}

// ── Wrap (final CTA) ───────────────────────────────────────────────

function Wrap() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  return (
    <section style={{ padding: "20vh 6vw", textAlign: "center" }}>
      <div ref={ref}>
        <motion.h2
          className="display"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1.2 }}
          style={{ fontSize: "clamp(3.5rem, 12vw, 11rem)", margin: 0, color: "var(--paper)", lineHeight: 0.95 }}
        >
          From script to <em style={{ color: "var(--brand)" }}>screen.</em>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.6 }}
          style={{ maxWidth: "48ch", margin: "32px auto", color: "var(--paper)", opacity: 0.8, fontSize: "1.1rem", lineHeight: 1.65 }}
        >
          Storyvord is the AI co-producer the set has been waiting for. Don't replace your team — supercharge it.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 1, ease: [0.77, 0, 0.175, 1] }}
          style={{ display: "inline-flex", flexDirection: "column", gap: 12, alignItems: "center", marginTop: 16 }}
        >
          <Link href="/register" className="lp-cta">
            Start for free
            <Image src="/storyvord/landing-page_startForFreeIcon.svg" alt="" width={16} height={16} aria-hidden />
          </Link>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--silver)", textTransform: "uppercase" }}>
            No credit card · No vendor lock-in
          </span>
        </motion.div>
      </div>
    </section>
  );
}

// ── End credits / footer ───────────────────────────────────────────

function EndCredits() {
  return (
    <footer id="contact" style={{ borderTop: "1px solid var(--rule)", padding: "10vh 6vw 6vh", display: "flex", flexDirection: "column", gap: 64 }}>
      <div className="lp-scene-no">END CREDITS</div>

      <dl className="lp-credits">
        <dt>Director</dt>          <dd>You</dd>
        <dt>Production</dt>        <dd>Storyvord AI Co-Producer</dd>
        <dt>Creative Hub</dt>      <dd>Script · Scenes · Characters · Locations · Wardrobe · Storyboard</dd>
        <dt>Plus AI tools for</dt>  <dd>Project management · Call sheets · Budget · Compliance · Crew</dd>
        <dt>Format</dt>             <dd>2.39 : 1 · Anamorphic · 24 fps</dd>
        <dt>Soundtrack</dt>         <dd>Composed in your edit suite</dd>
      </dl>

      <hr className="lp-rule" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
        <NavCol title="Features" links={[
          ["AI Script Breakdown", "/#features"],
          ["Creative Hub", "/#features"],
          ["AI Storyboard", "/#features"],
          ["AI Call Sheets", "/#features"],
          ["AI Project Management", "/#features"],
          ["AI Budget & Compliance", "/#features"],
        ]} />
        <NavCol title="Pricing"  links={[
          ["Indie", "/#pricing"],
          ["Studio", "/#pricing"],
          ["Oscar", "/#pricing"],
        ]} />
        <NavCol title="Studio"   links={[
          ["About", "/#contact"],
          ["Press", "/#contact"],
          ["Careers", "/#contact"],
          ["Contact", "mailto:hello@storyvord.io"],
        ]} />
        <NavCol title="Account"  links={[
          ["Log in", "/login"],
          ["Start for free", "/register"],
          ["Reset password", "/reset-password"],
        ]} />
      </div>

      <hr className="lp-rule" />

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }} className="mono">
        <span style={{ fontSize: 11, letterSpacing: "0.22em", color: "var(--silver)", textTransform: "uppercase" }}>
          © STORYVORD MMXXVI · ALL RIGHTS RESERVED
        </span>
        <span style={{ fontSize: 11, letterSpacing: "0.22em", color: "var(--silver)", textTransform: "uppercase" }}>
          AI CO-PRODUCER · MADE WITH FILMMAKERS
        </span>
      </div>
    </footer>
  );
}

function NavCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--silver)", textTransform: "uppercase", marginBottom: 18 }}>
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="lp-link mono" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--paper)" }}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
