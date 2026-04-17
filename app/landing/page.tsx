"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Video, Play, ChevronRight, Star, Zap, Globe, Users, FileText,
  Camera, Clapperboard, CalendarDays, Briefcase, CheckCircle, ArrowRight,
  Menu, X, Film, MapPin, Clock, Shield, TrendingUp, Layers,
  MessageSquare, BarChart2, Sparkles, Award, Twitter, Linkedin, Instagram,
  ChevronLeft,
} from "lucide-react";

// ── Types & Data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    phase: "Pre-Production",
    color: "#6366f1",
    bg: "#6366f108",
    border: "#6366f120",
    items: [
      { icon: <FileText size={18} />, title: "Script Breakdown", desc: "AI parses your screenplay and auto-tags every character, location, prop, and scene requirement — saving 80% of manual breakdown time.", screenshot: "/screenshots/script.png" },
      { icon: <Clapperboard size={18} />, title: "Scene Analysis", desc: "Every scene auto-extracted with scene headers, summaries, characters present, and locations linked — all from your script.", screenshot: "/screenshots/scenes.png" },
      { icon: <BarChart2 size={18} />, title: "Research Deck & Reports", desc: "Budget breakdown, logistics plan, crew recommendations, sustainability and compliance reports generated at a click.", screenshot: "/screenshots/reports.png" },
    ],
  },
  {
    phase: "Creative Hub",
    color: "#10b981",
    bg: "#10b98108",
    border: "#10b98120",
    items: [
      { icon: <Film size={18} />, title: "Storyboard", desc: "AI-generated shot-by-shot storyboards per scene. Switch styles (Anime, Cinematic, Sketch). Preview full sequences in Slideshow mode.", screenshot: "/screenshots/storyboard.png" },
      { icon: <Users size={18} />, title: "Characters per Scene", desc: "Full cast management with scene-specific looks — costume, aging, makeup per scene. Global reference portrait with Fitting Room.", screenshot: "/screenshots/anna-detail.png" },
      { icon: <MapPin size={18} />, title: "Locations", desc: "Location cards with images, descriptions, and scene links. Your scouting board organised by the AI breakdown.", screenshot: "/screenshots/locations.png" },
    ],
  },
  {
    phase: "Production",
    color: "#f59e0b",
    bg: "#f59e0b08",
    border: "#f59e0b20",
    items: [
      { icon: <CalendarDays size={18} />, title: "Call Sheets", desc: "Generate and distribute professional call sheets. Cast and crew receive auto-notifications with one click.", screenshot: "/screenshots/callsheets.png" },
      { icon: <CheckCircle size={18} />, title: "Tasks & Kanban", desc: "Kanban board across departments — To Do, In Progress, On Hold, Done. Assign to crew, set priority and due dates.", screenshot: "/screenshots/tasks.png" },
      { icon: <TrendingUp size={18} />, title: "Project Overview", desc: "At-a-glance project dashboard: status, team, recent activity, upcoming callsheets, and quick access to every module.", screenshot: "/screenshots/overview.png" },
    ],
  },
];

const STATS = [
  { value: "10,000+", label: "Productions managed" },
  { value: "80%", label: "Faster pre-production" },
  { value: "50+", label: "Countries supported" },
  { value: "4.9★", label: "Average rating" },
];

const TESTIMONIALS = [
  { quote: "Storyvord cut our pre-production time in half. The AI script breakdown alone saves us 2 days on every feature.", name: "Sarah Chen", role: "Producer, Sundance 2024", avatar: "S", color: "#6366f1" },
  { quote: "Finally a platform that understands how film productions actually work. Call sheets, crew, contracts — all in one place.", name: "Marcus Okafor", role: "Line Producer, Lagos", avatar: "M", color: "#10b981" },
  { quote: "We used Storyvord for our first international co-production. The compliance tools made a complex process manageable.", name: "Priya Mehta", role: "Executive Producer, Mumbai", avatar: "P", color: "#f59e0b" },
];

const FESTIVALS = ["Cannes", "Berlin", "Venice", "MIPCOM", "Sundance", "TIFF"];

const PRICING = [
  {
    name: "Indie", price: "$49", period: "/mo",
    desc: "Perfect for independent filmmakers and small productions.", color: "#6366f1",
    features: ["Up to 3 projects", "Script breakdown", "Call sheets", "Crew management (10)", "Basic AI assistance"],
    cta: "Start Free Trial",
  },
  {
    name: "Studio", price: "$199", period: "/mo", popular: true,
    desc: "For production companies running multiple projects simultaneously.", color: "#10b981",
    features: ["Unlimited projects", "All Indie features", "Storyboard generation", "Budget breakdown", "Contract creation", "Priority support"],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "For studios and large-scale international productions.", color: "#f59e0b",
    features: ["Everything in Studio", "International compliance", "Multi-currency budgets", "Dedicated account manager", "Custom integrations", "SLA guarantee"],
    cta: "Contact Sales",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function GradientText({ children, colors = ["#10b981", "#6366f1"] }: { children: React.ReactNode; colors?: string[] }) {
  return (
    <span style={{ background: `linear-gradient(135deg, ${colors.join(", ")})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
      {children}
    </span>
  );
}

// ── Screenshot Showcase ───────────────────────────────────────────────────────

const SHOWCASE_TABS = [
  { label: "Dashboard",     src: "/screenshots/dashboard.png",    badge: "Overview",      color: "#6366f1" },
  { label: "Script Editor", src: "/screenshots/script.png",       badge: "AI Breakdown",  color: "#10b981" },
  { label: "Storyboard",    src: "/screenshots/storyboard.png",   badge: "AI Generated",  color: "#f59e0b" },
  { label: "Scenes",        src: "/screenshots/scenes.png",       badge: "Scene Analysis",color: "#06b6d4" },
  { label: "Characters",    src: "/screenshots/anna-detail.png",  badge: "Cast & Looks",  color: "#a78bfa", overlay: "/screenshots/anna-sc03.png" },
  { label: "Fitting Room",  src: "/screenshots/anna-sc03.png",    badge: "Scene Costume", color: "#f472b6" },
  { label: "Locations",     src: "/screenshots/locations.png",    badge: "Scouting",      color: "#fb923c" },
  { label: "Research Deck", src: "/screenshots/reports.png",      badge: "AI Reports",    color: "#34d399" },
  { label: "Tasks",         src: "/screenshots/tasks.png",        badge: "Kanban",        color: "#ec4899" },
];

function ScreenshotShowcase() {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");

  const go = useCallback((idx: number) => {
    setAnimDir(idx > active ? "right" : "left");
    setPrev(active);
    setActive(idx);
    setTimeout(() => setPrev(null), 350);
  }, [active]);

  // Auto-cycle
  useEffect(() => {
    const t = setInterval(() => go((active + 1) % SHOWCASE_TABS.length), 4000);
    return () => clearInterval(t);
  }, [active, go]);

  const tab = SHOWCASE_TABS[active];

  return (
    <div style={{ position: "relative" }}>
      {/* Tab strip */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {SHOWCASE_TABS.map((t, i) => (
          <button key={t.label} onClick={() => go(i)} style={{
            padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${i === active ? t.color + "60" : "rgba(255,255,255,.08)"}`,
            background: i === active ? `${t.color}18` : "transparent",
            color: i === active ? t.color : "#64748b", transition: "all .2s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Screenshot frame */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "#0f1117", boxShadow: `0 0 80px ${tab.color}18` }}>
        {/* browser chrome */}
        <div style={{ background: "#161822", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, height: 16, background: "#1e2130", borderRadius: 6, marginLeft: 8, display: "flex", alignItems: "center", paddingLeft: 10 }}>
            <span style={{ fontSize: 9, color: "#475569" }}>storyvord.io · {tab.label.toLowerCase()}</span>
          </div>
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: `${tab.color}20`, color: tab.color, fontWeight: 700 }}>
            {tab.badge}
          </span>
        </div>

        {/* Image */}
        <div style={{ position: "relative", height: 520, overflow: "hidden" }}>
          <Image
            key={active}
            src={tab.src}
            alt={tab.label}
            fill
            style={{ objectFit: "cover", objectPosition: "top" }}
            priority
          />
          {/* gradient fade at bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #0f1117)" }} />

          {/* SC 03 Fitting Room popup overlay — shown when tab has overlay */}
          {tab.overlay && (
            <div style={{
              position: "absolute", bottom: 24, right: 24,
              width: 260, borderRadius: 12,
              border: `1px solid ${tab.color}50`,
              background: "#0d0f1a",
              boxShadow: `0 8px 40px rgba(0,0,0,.7), 0 0 0 1px ${tab.color}20`,
              overflow: "hidden",
              animation: "popIn .35s cubic-bezier(.34,1.56,.64,1)",
            }}>
              {/* mini browser bar */}
              <div style={{ background: "#161822", borderBottom: `1px solid ${tab.color}30`, padding: "5px 8px", display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />)}
                </div>
                <span style={{ fontSize: 8, color: tab.color, fontWeight: 700, marginLeft: 4 }}>SC 03 · SOUND STUDIO — Fitting Room</span>
              </div>
              <div style={{ position: "relative", height: 180 }}>
                <Image src={tab.overlay} alt="SC 03 Fitting Room" fill style={{ objectFit: "cover", objectPosition: "top" }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Prev / Next */}
      <button onClick={() => go((active - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length)}
        style={{ position: "absolute", left: -16, top: "55%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", background: "#161822", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ChevronLeft size={14} />
      </button>
      <button onClick={() => go((active + 1) % SHOWCASE_TABS.length)}
        style={{ position: "absolute", right: -16, top: "55%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", background: "#161822", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ChevronRight size={14} />
      </button>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
        {SHOWCASE_TABS.map((_, i) => (
          <div key={i} onClick={() => go(i)} style={{ width: i === active ? 20 : 6, height: 6, borderRadius: 99, background: i === active ? tab.color : "rgba(255,255,255,.15)", cursor: "pointer", transition: "all .3s" }} />
        ))}
      </div>
    </div>
  );
}

// ── Feature Section ───────────────────────────────────────────────────────────

function FeatureSection() {
  const [activePhase, setActivePhase] = useState(0);
  const [activeItem, setActiveItem] = useState(0);

  const phase = FEATURES[activePhase];
  const item = phase.items[activeItem];

  return (
    <div>
      {/* Phase tabs */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>
        {FEATURES.map((f, i) => (
          <button key={f.phase} onClick={() => { setActivePhase(i); setActiveItem(0); }}
            style={{
              padding: "9px 22px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${i === activePhase ? f.color : "rgba(255,255,255,.08)"}`,
              background: i === activePhase ? `${f.color}18` : "transparent",
              color: i === activePhase ? f.color : "#64748b", transition: "all .2s",
            }}>
            {f.phase}
          </button>
        ))}
      </div>

      {/* Two-col: feature list + screenshot */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 32, alignItems: "start" }}>
        {/* Left: feature cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {phase.items.map((feat, i) => (
            <div key={feat.title} onClick={() => setActiveItem(i)}
              style={{
                padding: "16px 20px", borderRadius: 14, cursor: "pointer",
                border: `1px solid ${i === activeItem ? phase.color + "40" : "rgba(255,255,255,.06)"}`,
                background: i === activeItem ? `${phase.color}0c` : "rgba(255,255,255,.01)",
                transition: "all .2s",
              }}
              onMouseEnter={e => { if (i !== activeItem) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.03)"; }}
              onMouseLeave={e => { if (i !== activeItem) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.01)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i === activeItem ? 8 : 0 }}>
                <span style={{ color: i === activeItem ? phase.color : "#475569", transition: "color .2s" }}>{feat.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: i === activeItem ? "#e2e8f0" : "#94a3b8" }}>{feat.title}</span>
                {i === activeItem && <ChevronRight size={14} style={{ color: phase.color, marginLeft: "auto" }} />}
              </div>
              {i === activeItem && (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{feat.desc}</p>
              )}
            </div>
          ))}
        </div>

        {/* Right: screenshot */}
        <div style={{ position: "sticky", top: 80 }}>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${phase.color}25`, boxShadow: `0 0 60px ${phase.color}12`, background: "#0f1117" }}>
            {/* browser bar */}
            <div style={{ background: "#161822", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
              </div>
              <div style={{ flex: 1, height: 14, background: "#1e2130", borderRadius: 4, marginLeft: 6 }} />
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: `${phase.color}20`, color: phase.color, fontWeight: 700 }}>LIVE</span>
            </div>
            <div style={{ position: "relative", height: 400, overflow: "hidden" }}>
              <Image
                key={`${activePhase}-${activeItem}`}
                src={item.screenshot}
                alt={item.title}
                fill
                style={{ objectFit: "cover", objectPosition: "top" }}
              />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(transparent, #0f1117)" }} />
            </div>
          </div>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <span style={{ fontSize: 11, color: "#334155" }}>Actual screenshot from Storyvord · Test Project</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#080b12", color: "#e2e8f0", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 32px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(8,11,18,.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "1px solid transparent",
        transition: "all .3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Video size={18} style={{ color: "#10b981" }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.02em" }}>Storyvord</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {["Features", "Pricing", "About"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "#94a3b8"; }}>
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isLoggedIn ? (
            <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "#000", textDecoration: "none", padding: "7px 18px", borderRadius: 8, background: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
              Go to Dashboard <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "7px 14px", borderRadius: 8 }}>
                Sign in
              </Link>
              <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#000", textDecoration: "none", padding: "7px 18px", borderRadius: 8, background: "#10b981" }}>
                Get started free
              </Link>
            </>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: "none", background: "none", border: "none", color: "#e2e8f0", cursor: "pointer" }} className="mobile-btn">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "#080b12", paddingTop: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, fontSize: 18 }}>
          {["Features", "Pricing", "About"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{ color: "#e2e8f0", textDecoration: "none" }}>{item}</a>
          ))}
          <Link href="/login" style={{ marginTop: 16, padding: "12px 36px", borderRadius: 10, background: "#10b981", color: "#000", fontWeight: 700, textDecoration: "none" }}>
            Get started free
          </Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 32px 60px", position: "relative", overflow: "hidden" }}>
        {/* bg glows */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "35%", left: "15%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: "10%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 820, textAlign: "center", position: "relative", width: "100%" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, border: "1px solid rgba(16,185,129,.25)", background: "rgba(16,185,129,.08)", marginBottom: 28, fontSize: 12, color: "#10b981", fontWeight: 600 }}>
            <Sparkles size={12} />
            AI Co-Producer — Built for Modern Filmmakers
          </div>

          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 800, lineHeight: 1.07, letterSpacing: "-.03em", margin: "0 0 22px" }}>
            The Production Platform<br />
            <GradientText colors={["#10b981", "#6366f1"]}>Powered by AI</GradientText>
          </h1>

          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#94a3b8", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.65 }}>
            From script breakdown to storyboard, call sheets to crew — Storyvord automates the complexity of film production so you can focus on your creative vision.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            {isLoggedIn ? (
              <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
                Start for free <ArrowRight size={16} />
              </Link>
            )}
            <a href="#features" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
              <Play size={14} style={{ fill: "#e2e8f0" }} /> See it in action
            </a>
          </div>

          {/* Festival trust */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <p style={{ fontSize: 11, color: "#334155", letterSpacing: ".1em", textTransform: "uppercase" }}>Trusted by productions at</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
              {FESTIVALS.map(f => (
                <span key={f} style={{ fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: ".06em", padding: "4px 10px", border: "1px solid #1a1f2e", borderRadius: 6 }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "40px 32px", borderTop: "1px solid rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.03em", background: "linear-gradient(135deg, #10b981, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ── */}
      <section id="about" style={{ padding: "90px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Product Tour</span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 14px" }}>
              See Storyvord in action
            </h2>
            <p style={{ color: "#475569", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
              Real screenshots from an active production — not mockups.
            </p>
          </div>
          <ScreenshotShowcase />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "90px 32px", background: "rgba(255,255,255,.01)", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Features</span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 14px" }}>
              Built for every stage of production
            </h2>
            <p style={{ color: "#475569", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
              One platform replacing dozens of spreadsheets, tools, and Slack threads.
            </p>
          </div>
          <FeatureSection />

          {/* All features pills */}
          <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {[
              { icon: <Clapperboard size={14} />, label: "Scene Breakdown" },
              { icon: <MapPin size={14} />, label: "Location Scouting" },
              { icon: <Users size={14} />, label: "Cast Management" },
              { icon: <Briefcase size={14} />, label: "Job Board" },
              { icon: <BarChart2 size={14} />, label: "Research Deck" },
              { icon: <TrendingUp size={14} />, label: "Analytics" },
              { icon: <Layers size={14} />, label: "File Management" },
              { icon: <Award size={14} />, label: "Festival Ready" },
              { icon: <Shield size={14} />, label: "Compliance Reports" },
              { icon: <Globe size={14} />, label: "International Co-Production" },
              { icon: <MessageSquare size={14} />, label: "Team Inbox" },
              { icon: <Clock size={14} />, label: "Callsheet Automation" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.05)", background: "rgba(255,255,255,.02)" }}>
                <span style={{ color: "#10b981", flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW CTA ── */}
      <section style={{ padding: "90px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", background: "linear-gradient(135deg, rgba(16,185,129,.1), rgba(99,102,241,.1))", border: "1px solid rgba(16,185,129,.18)", borderRadius: 24, padding: "64px 48px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(16,185,129,.3)", background: "rgba(16,185,129,.08)", marginBottom: 24, fontSize: 12, color: "#10b981", fontWeight: 600 }}>
            <Zap size={12} /> AI-Powered Workflow
          </div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 16px" }}>
            From script to set in record time
          </h2>
          <p style={{ color: "#475569", fontSize: 16, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.65 }}>
            Upload your screenplay. Storyvord's AI reads it and generates scene breakdowns, storyboards, call sheets, and crew requirements — automatically.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, maxWidth: 680, margin: "0 auto 40px" }}>
            {[
              { step: "01", label: "Upload Script", desc: "Drop in your screenplay" },
              { step: "02", label: "AI Breakdown", desc: "Scenes tagged instantly" },
              { step: "03", label: "Build Schedule", desc: "Drag-drop shooting days" },
              { step: "04", label: "Crew & Shoot", desc: "Call sheets auto-sent" },
            ].map(s => (
              <div key={s.step} style={{ textAlign: "left", padding: "16px", background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", marginBottom: 8, letterSpacing: ".05em" }}>{s.step}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <Link href={isLoggedIn ? "/dashboard" : "/login"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
            {isLoggedIn ? "Go to Dashboard" : "Try it free"} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "80px 32px", background: "rgba(255,255,255,.01)", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Testimonials</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 0" }}>
              Loved by filmmakers worldwide
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "26px" }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} style={{ fill: "#f59e0b", color: "#f59e0b" }} />)}
                </div>
                <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.65, margin: "0 0 20px" }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${t.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "90px 32px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Pricing</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 10px" }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "#475569", fontSize: 15 }}>Start free. Upgrade when your production scales.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {PRICING.map(plan => (
              <div key={plan.name} style={{
                background: plan.popular ? `linear-gradient(135deg, ${plan.color}12, rgba(255,255,255,.02))` : "rgba(255,255,255,.02)",
                border: `1px solid ${plan.popular ? plan.color + "40" : "rgba(255,255,255,.06)"}`,
                borderRadius: 20, padding: "28px 24px", position: "relative",
              }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 99, background: plan.color, color: "#000" }}>
                    Most Popular
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: plan.color }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: "#475569" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
                <p style={{ fontSize: 12, color: "#475569", marginBottom: 20, lineHeight: 1.55 }}>{plan.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <CheckCircle size={13} style={{ color: plan.color, flexShrink: 0 }} />
                      <span style={{ color: "#94a3b8" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login" style={{
                  display: "block", textAlign: "center", padding: "11px", borderRadius: 10,
                  background: plan.popular ? plan.color : "transparent",
                  border: `1px solid ${plan.popular ? "transparent" : plan.color + "50"}`,
                  color: plan.popular ? "#000" : plan.color, fontWeight: 700, fontSize: 13, textDecoration: "none",
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "100px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 20px", lineHeight: 1.1 }}>
            Ready to simplify<br />
            <GradientText colors={["#10b981", "#6366f1"]}>your production?</GradientText>
          </h2>
          <p style={{ color: "#475569", fontSize: 17, marginBottom: 36, lineHeight: 1.65 }}>
            Join thousands of filmmakers who use Storyvord to ship better productions, faster.
          </p>
          <Link href={isLoggedIn ? "/dashboard" : "/login"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
            {isLoggedIn ? "Go to Dashboard" : "Start for free"} <ArrowRight size={16} />
          </Link>
          {!isLoggedIn && <p style={{ marginTop: 14, fontSize: 12, color: "#1e293b" }}>No credit card required · Free forever plan</p>}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "36px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Video size={16} style={{ color: "#10b981" }} />
            <span style={{ fontWeight: 800, fontSize: 14 }}>Storyvord</span>
            <span style={{ fontSize: 12, color: "#1e293b", marginLeft: 10 }}>© 2025 All rights reserved.</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: "#334155", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[<Twitter key="t" size={15} />, <Linkedin key="l" size={15} />, <Instagram key="i" size={15} />].map((icon, i) => (
              <a key={i} href="#" style={{ color: "#334155" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#10b981"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#334155"; }}>
                {icon}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .mobile-btn { display: flex !important; }
        }
        @media (max-width: 900px) {
          [data-feature-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
