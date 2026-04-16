"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { searchCrew, CrewProfile } from "@/services/crew";

function Avatar({ src, name, size = 52 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = (name ?? "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <img src={src} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function CrewSearchPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [results, setResults] = useState<CrewProfile[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const skills = skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await searchCrew({ name, location, skills });
      setResults(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const displayName = (p: CrewProfile) => p.full_name ?? p.name ?? "Unknown";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>Find Crew</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>Search for crew members by name, location, or skills.</p>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. John Doe"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. London"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 240px" }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Skills (comma-separated)</label>
            <input
              value={skillsRaw}
              onChange={(e) => setSkillsRaw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. React, Cinematography"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: 14, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && !loading && results.length === 0 && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 40 }}>No crew members found. Try different filters.</p>
        )}

        {results.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {results.map((p, i) => (
              <div key={p.id ?? i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
                <Avatar src={p.image} name={displayName(p)} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{displayName(p)}</div>
                  {p.job_title && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.job_title}</div>}
                  {p.location && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {String(p.location)}
                    </div>
                  )}
                  {Array.isArray(p.skills) && p.skills.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 8 }}>
                      {p.skills.slice(0, 4).map((skill, j) => (
                        <span key={j} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "var(--accent)" + "22", color: "var(--accent)", border: "1px solid var(--accent)" + "44" }}>
                          {String(skill)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
