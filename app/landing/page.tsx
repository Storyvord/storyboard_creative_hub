"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Video, Play, ChevronRight, Star, Zap, Globe, Users, FileText,
  Camera, Clapperboard, CalendarDays, Briefcase, CheckCircle, ArrowRight,
  Menu, X, Film, Mic, MapPin, Clock, Shield, TrendingUp, Layers,
  MessageSquare, BarChart2, Sparkles, Award, Twitter, Linkedin, Instagram,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    phase: "Pre-Production",
    color: "#6366f1",
    bg: "#6366f108",
    border: "#6366f120",
    items: [
      { icon: <FileText size={18} />, title: "Script Breakdown", desc: "AI parses your script and auto-tags characters, locations, props, and scene requirements — saving 80% of manual breakdown time." },
      { icon: <Clapperboard size={18} />, title: "Storyboard Generation", desc: "Turn scene descriptions into visual storyboards instantly. Brief your team with AI-generated shot references." },
      { icon: <BarChart2 size={18} />, title: "Budget Breakdown", desc: "Get intelligent budget estimates by department. Track actuals vs. estimates in real-time across the production." },
    ],
  },
  {
    phase: "Production",
    color: "#10b981",
    bg: "#10b98108",
    border: "#10b98120",
    items: [
      { icon: <CalendarDays size={18} />, title: "Call Sheets", desc: "Generate and distribute professional call sheets in minutes. Cast and crew get auto-notified with one click." },
      { icon: <Users size={18} />, title: "Crew Management", desc: "Find, invite, and coordinate your entire crew. Built-in roles, permissions, and availability tracking." },
      { icon: <Camera size={18} />, title: "Shot Lists & Scheduling", desc: "Drag-and-drop shooting schedule linked to your locations, cast, and equipment — all synced live." },
    ],
  },
  {
    phase: "Collaboration",
    color: "#f59e0b",
    bg: "#f59e0b08",
    border: "#f59e0b20",
    items: [
      { icon: <MessageSquare size={18} />, title: "Team Inbox", desc: "Centralized messaging between producers, directors, and crew. No more scattered WhatsApp threads." },
      { icon: <Shield size={18} />, title: "Contract Creation", desc: "Generate industry-standard contracts for cast and crew. E-sign ready, GDPR-compliant." },
      { icon: <Globe size={18} />, title: "International Compliance", desc: "Built-in support for international co-productions, union agreements, and multi-currency budgets." },
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
  {
    quote: "Storyvord cut our pre-production time in half. The AI script breakdown alone saves us 2 days on every feature.",
    name: "Sarah Chen",
    role: "Producer, Sundance 2024",
    avatar: "S",
    color: "#6366f1",
  },
  {
    quote: "Finally a platform that understands how film productions actually work. Call sheets, crew, contracts — all in one place.",
    name: "Marcus Okafor",
    role: "Line Producer, Lagos",
    avatar: "M",
    color: "#10b981",
  },
  {
    quote: "We used Storyvord for our first international co-production. The compliance tools made a complex process manageable.",
    name: "Priya Mehta",
    role: "Executive Producer, Mumbai",
    avatar: "P",
    color: "#f59e0b",
  },
];

const FESTIVALS = ["Cannes", "Berlin", "Venice", "MIPCOM", "Sundance", "TIFF"];

const PRICING = [
  {
    name: "Indie",
    price: "$49",
    period: "/mo",
    desc: "Perfect for independent filmmakers and small productions.",
    color: "#6366f1",
    features: ["Up to 3 projects", "Script breakdown", "Call sheets", "Crew management (10)", "Basic AI assistance"],
    cta: "Start Free Trial",
  },
  {
    name: "Studio",
    price: "$199",
    period: "/mo",
    desc: "For production companies running multiple projects simultaneously.",
    color: "#10b981",
    popular: true,
    features: ["Unlimited projects", "All Indie features", "Storyboard generation", "Budget breakdown", "Contract creation", "Priority support"],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For studios and large-scale international productions.",
    color: "#f59e0b",
    features: ["Everything in Studio", "International compliance", "Multi-currency budgets", "Dedicated account manager", "Custom integrations", "SLA guarantee"],
    cta: "Contact Sales",
  },
];

// ── Components ────────────────────────────────────────────────────────────────

function GradientText({ children, colors = ["#10b981", "#6366f1"] }: { children: React.ReactNode; colors?: string[] }) {
  return (
    <span style={{ background: `linear-gradient(135deg, ${colors.join(", ")})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
      {children}
    </span>
  );
}

// Mock UI Screenshot components
function MockDashboard() {
  return (
    <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 12, overflow: "hidden", fontSize: 11, fontFamily: "system-ui" }}>
      {/* top bar */}
      <div style={{ background: "#161822", borderBottom: "1px solid #1e2130", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, height: 14, background: "#1e2130", borderRadius: 4, marginLeft: 8 }} />
      </div>
      {/* content */}
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Projects", value: "12", color: "#10b981" },
          { label: "Tasks Due", value: "7", color: "#f59e0b" },
          { label: "Crew", value: "34", color: "#6366f1" },
        ].map(s => (
          <div key={s.label} style={{ background: "#161822", border: "1px solid #1e2130", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: "#64748b", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {["Black Mirror S3", "Feature Doc — Lagos", "Short Film — Mumbai"].map((p, i) => (
          <div key={p} style={{ background: "#161822", border: "1px solid #1e2130", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: ["#10b98120", "#6366f120", "#f59e0b20"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: ["#10b981", "#6366f1", "#f59e0b"][i] }}>
                {p[0]}
              </div>
              <span style={{ color: "#e2e8f0" }}>{p}</span>
            </div>
            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: ["#10b98120", "#6366f120", "#f59e0b20"][i], color: ["#10b981", "#6366f1", "#f59e0b"][i] }}>
              {["Active", "Pre-prod", "Planning"][i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockCallsheet() {
  return (
    <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 12, overflow: "hidden", fontSize: 11 }}>
      <div style={{ background: "#10b98110", borderBottom: "1px solid #10b98130", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <CalendarDays size={13} style={{ color: "#10b981" }} />
        <span style={{ color: "#10b981", fontWeight: 700, fontSize: 12 }}>Call Sheet — Day 4</span>
        <span style={{ marginLeft: "auto", color: "#64748b" }}>June 14, 2025</span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { time: "06:00", item: "Crew Call", loc: "Studio A, Mumbai" },
          { time: "07:30", item: "Camera Dept Ready", loc: "Main Set" },
          { time: "08:00", item: "Scene 12 — INT. OFFICE", loc: "Set B" },
          { time: "12:00", item: "Lunch Break", loc: "Base Camp" },
          { time: "13:00", item: "Scene 15 — EXT. ROOFTOP", loc: "Location 3" },
        ].map(row => (
          <div key={row.time} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "#10b981", fontWeight: 700, minWidth: 38 }}>{row.time}</span>
            <div style={{ flex: 1, background: "#161822", border: "1px solid #1e2130", borderRadius: 7, padding: "5px 8px" }}>
              <div style={{ color: "#e2e8f0", fontWeight: 500 }}>{row.item}</div>
              <div style={{ color: "#475569", marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin size={9} />{row.loc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockStoryboard() {
  const shots = ["EXT. STREET — WIDE", "INT. OFFICE — MCU", "EXT. ROOFTOP — OTS", "INT. CAR — CU"];
  return (
    <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 12, overflow: "hidden", fontSize: 11 }}>
      <div style={{ background: "#6366f110", borderBottom: "1px solid #6366f130", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <Film size={13} style={{ color: "#6366f1" }} />
        <span style={{ color: "#6366f1", fontWeight: 700, fontSize: 12 }}>Storyboard — Scene 12</span>
        <span style={{ marginLeft: "auto", fontSize: 9, padding: "2px 6px", borderRadius: 99, background: "#6366f120", color: "#6366f1" }}>AI Generated</span>
      </div>
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {shots.map((s, i) => (
          <div key={s} style={{ background: "#161822", border: "1px solid #1e2130", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ height: 60, background: `linear-gradient(135deg, #${["1e2130", "252836", "1a1d2a", "202535"][i]}, #${["252836", "2d3148", "252836", "252836"][i]})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} style={{ color: "#475569" }} />
            </div>
            <div style={{ padding: "5px 7px", color: "#94a3b8" }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#080b12", color: "#e2e8f0", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(8,11,18,.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "1px solid transparent",
        transition: "all .3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Video size={18} style={{ color: "#10b981" }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.02em" }}>Storyvord</span>
        </div>

        {/* Desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="desktop-nav">
          {["Features", "Pricing", "About"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "#94a3b8"; }}
            >{item}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "7px 14px", borderRadius: 8, transition: "color .2s" }}>
            Sign in
          </Link>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 600, color: "#000", textDecoration: "none",
            padding: "7px 16px", borderRadius: 8, background: "#10b981", transition: "opacity .2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = ".85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            Get started free
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn"
            style={{ display: "none", background: "none", border: "none", color: "#e2e8f0", cursor: "pointer", padding: 4 }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "#080b12", paddingTop: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, fontSize: 18 }}>
          {["Features", "Pricing", "About"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
              style={{ color: "#e2e8f0", textDecoration: "none" }}>{item}</a>
          ))}
          <Link href="/login" style={{ marginTop: 20, padding: "12px 32px", borderRadius: 10, background: "#10b981", color: "#000", fontWeight: 700, textDecoration: "none", fontSize: 16 }}>
            Get started free
          </Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "25%", right: "15%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 900, textAlign: "center", position: "relative" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, border: "1px solid rgba(16,185,129,.25)", background: "rgba(16,185,129,.08)", marginBottom: 28, fontSize: 12, color: "#10b981" }}>
            <Sparkles size={12} />
            <span>AI Co-Producer — Built for Modern Filmmakers</span>
          </div>

          <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", margin: "0 0 24px" }}>
            The Production Platform<br />
            <GradientText colors={["#10b981", "#6366f1"]}>Powered by AI</GradientText>
          </h1>

          <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: "#94a3b8", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.6 }}>
            From script breakdown to final cut — Storyvord automates the complexity of film production so you can focus on your creative vision.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px",
              borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700,
              fontSize: 15, textDecoration: "none", transition: "opacity .2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = ".85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#features" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 24px",
              borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0",
              fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "border-color .2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.1)"; }}
            >
              <Play size={15} style={{ fill: "#e2e8f0" }} /> Watch demo
            </a>
          </div>

          {/* Festival logos */}
          <div style={{ marginTop: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <p style={{ fontSize: 11, color: "#475569", letterSpacing: ".1em", textTransform: "uppercase" }}>Trusted by productions at</p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
              {FESTIVALS.map(f => (
                <span key={f} style={{ fontSize: 12, fontWeight: 700, color: "#334155", letterSpacing: ".05em", padding: "4px 10px", border: "1px solid #1e2130", borderRadius: 6 }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.03em", background: "linear-gradient(135deg, #10b981, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Product</span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 16px" }}>
              Everything your production needs
            </h2>
            <p style={{ color: "#64748b", fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
              One platform replacing dozens of spreadsheets, tools, and Slack threads.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            <MockDashboard />
            <MockCallsheet />
            <MockStoryboard />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "80px 24px", background: "rgba(255,255,255,.01)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Features</span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 16px" }}>
              Built for every stage of production
            </h2>
          </div>

          {/* Phase tabs */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>
            {FEATURES.map((f, i) => (
              <button key={f.phase} onClick={() => setActiveFeature(i)}
                style={{
                  padding: "8px 20px", borderRadius: 99, border: `1px solid ${i === activeFeature ? f.color : "rgba(255,255,255,.08)"}`,
                  background: i === activeFeature ? `${f.color}18` : "transparent",
                  color: i === activeFeature ? f.color : "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "all .2s",
                }}>
                {f.phase}
              </button>
            ))}
          </div>

          {/* Feature cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {FEATURES[activeFeature].items.map(item => (
              <div key={item.title}
                style={{ background: FEATURES[activeFeature].bg, border: `1px solid ${FEATURES[activeFeature].border}`, borderRadius: 16, padding: "22px 24px", transition: "transform .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${FEATURES[activeFeature].color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: FEATURES[activeFeature].color, marginBottom: 16 }}>
                  {item.icon}
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* All features grid */}
          <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { icon: <Clapperboard size={15} />, label: "Scenes & Characters" },
              { icon: <MapPin size={15} />, label: "Location Scouting" },
              { icon: <Users size={15} />, label: "Cast Management" },
              { icon: <Briefcase size={15} />, label: "Job Board" },
              { icon: <BarChart2 size={15} />, label: "Research Deck" },
              { icon: <TrendingUp size={15} />, label: "Analytics" },
              { icon: <Layers size={15} />, label: "File Management" },
              { icon: <Award size={15} />, label: "Festival Ready" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
                <span style={{ color: "#10b981" }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW CTA ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", background: "linear-gradient(135deg, rgba(16,185,129,.12), rgba(99,102,241,.12))", border: "1px solid rgba(16,185,129,.2)", borderRadius: 24, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(16,185,129,.3)", background: "rgba(16,185,129,.08)", marginBottom: 24, fontSize: 12, color: "#10b981" }}>
            <Zap size={12} />
            <span>AI-Powered Workflow</span>
          </div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 16px" }}>
            From script to set in record time
          </h2>
          <p style={{ color: "#64748b", fontSize: 16, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.6 }}>
            Storyvord's AI reads your script and generates breakdowns, storyboards, call sheets, and crew requirements — automatically.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, maxWidth: 700, margin: "0 auto 36px" }}>
            {[
              { step: "01", label: "Upload Script", desc: "Drop in your screenplay" },
              { step: "02", label: "AI Breakdown", desc: "Scenes tagged in seconds" },
              { step: "03", label: "Build Schedule", desc: "Drag-drop shooting days" },
              { step: "04", label: "Crew & Shoot", desc: "Call sheets auto-sent" },
            ].map(s => (
              <div key={s.step} style={{ textAlign: "left", padding: "16px", background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", marginBottom: 8, letterSpacing: ".05em" }}>{s.step}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px",
            borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700,
            fontSize: 15, textDecoration: "none",
          }}>
            Try it free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "80px 24px", background: "rgba(255,255,255,.01)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Testimonials</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 0" }}>
              Loved by filmmakers worldwide
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "24px", position: "relative" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} style={{ fill: "#f59e0b", color: "#f59e0b" }} />)}
                </div>
                <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 20px" }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${t.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <span style={{ fontSize: 11, color: "#10b981", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Pricing</span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.03em", margin: "12px 0 12px" }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>Start free. Upgrade when your production scales.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {PRICING.map(plan => (
              <div key={plan.name} style={{
                background: plan.popular ? `linear-gradient(135deg, ${plan.color}12, rgba(255,255,255,.02))` : "rgba(255,255,255,.02)",
                border: `1px solid ${plan.popular ? plan.color + "40" : "rgba(255,255,255,.06)"}`,
                borderRadius: 20, padding: "28px 24px", position: "relative",
              }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99, background: plan.color, color: "#000" }}>
                    Most Popular
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: plan.color }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>{plan.desc}</p>
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
                  border: `1px solid ${plan.popular ? "transparent" : plan.color + "60"}`,
                  color: plan.popular ? "#000" : plan.color, fontWeight: 700, fontSize: 13, textDecoration: "none",
                  transition: "opacity .2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = ".8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 20px", lineHeight: 1.1 }}>
            Ready to simplify<br />
            <GradientText colors={["#10b981", "#6366f1"]}>your production?</GradientText>
          </h2>
          <p style={{ color: "#64748b", fontSize: 17, marginBottom: 36, lineHeight: 1.6 }}>
            Join thousands of filmmakers who use Storyvord to ship better productions, faster.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px",
              borderRadius: 12, background: "#10b981", color: "#000", fontWeight: 700,
              fontSize: 16, textDecoration: "none",
            }}>
              Start for free <ArrowRight size={16} />
            </Link>
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: "#334155" }}>No credit card required · Free forever plan</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Video size={16} style={{ color: "#10b981" }} />
            <span style={{ fontWeight: 800, fontSize: 15 }}>Storyvord</span>
            <span style={{ fontSize: 12, color: "#334155", marginLeft: 8 }}>© 2025 Storyvord. All rights reserved.</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[<Twitter key="t" size={15} />, <Linkedin key="l" size={15} />, <Instagram key="i" size={15} />].map((icon, i) => (
              <a key={i} href="#" style={{ color: "#475569", transition: "color .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#10b981"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#475569"; }}>
                {icon}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
