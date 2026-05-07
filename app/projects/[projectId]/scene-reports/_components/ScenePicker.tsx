"use client";

// Two-step picker used by the Scene Reports page:
//   1. Pick a script (auto-skipped when only one exists for the project).
//   2. Pick a scene from that script.
//
// Renders a search-filtered grid of scene cards. Selecting a card calls
// `onSceneSelect(scene)`. Pure UI — data is fetched and owned by the parent.

import * as React from "react";
import { Search, MapPin, Clapperboard, ChevronDown } from "lucide-react";
import { Scene, Script } from "@/types/creative-hub";

interface ScenePickerProps {
  scripts: Script[];
  selectedScript: Script | null;
  onScriptChange: (script: Script) => void;
  scenes: Scene[];
  selectedSceneId: number | null;
  onSceneSelect: (scene: Scene) => void;
  loading?: boolean;
}

export default function ScenePicker({
  scripts,
  selectedScript,
  onScriptChange,
  scenes,
  selectedSceneId,
  onSceneSelect,
  loading,
}: ScenePickerProps) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scenes;
    return scenes.filter((s) => {
      const name = (s.scene_name ?? "").toLowerCase();
      const order = String(s.order ?? "");
      const loc = (s.location ?? "").toLowerCase();
      return name.includes(q) || order.includes(q) || loc.includes(q);
    });
  }, [scenes, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Step 1: Script selector — only when multiple scripts */}
      {scripts.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Step 1 — Pick a Script
          </p>
          <div style={{ position: "relative" }}>
            <select
              value={selectedScript?.id ?? ""}
              onChange={(e) => {
                const s = scripts.find((x) => String(x.id) === e.target.value);
                if (s) onScriptChange(s);
              }}
              style={{
                width: "100%",
                padding: "9px 36px 9px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: "var(--text-primary)",
                fontSize: 13,
                appearance: "none",
                cursor: "pointer",
              }}
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || `Script #${s.id}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      )}

      {/* Step 2: Scene picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {scripts.length > 1 ? "Step 2 — " : "Step 1 — "}Pick a Scene
            {selectedScript ? ` (${selectedScript.title || "script"})` : ""}
          </p>
          <div style={{ position: "relative", width: 240, maxWidth: "50%" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenes…"
              style={{
                width: "100%",
                padding: "7px 10px 7px 28px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: "var(--text-primary)",
                fontSize: 12,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              borderRadius: 10,
              border: "1px dashed var(--border)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Loading scenes…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              borderRadius: 10,
              border: "1px dashed var(--border)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {scenes.length === 0 ? "No scenes found for this script." : "No scenes match your search."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {filtered.map((scene) => {
              const active = scene.id === selectedSceneId;
              const charCount = Array.isArray(scene.scene_characters) ? scene.scene_characters.length : undefined;
              return (
                <button
                  key={scene.id}
                  onClick={() => onSceneSelect(scene)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: active ? "1px solid #22c55e" : "1px solid var(--border)",
                    background: active ? "rgba(34,197,94,0.08)" : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    minHeight: 96,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 5,
                        background: active ? "#22c55e" : "var(--surface-raised)",
                        color: active ? "#fff" : "var(--text-secondary)",
                        border: active ? "none" : "1px solid var(--border)",
                      }}
                    >
                      SC {scene.order}
                    </span>
                    {scene.int_ext && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {scene.int_ext}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      wordBreak: "break-word",
                    }}
                  >
                    {scene.scene_name || `Scene ${scene.order}`}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, color: "var(--text-muted)" }}>
                    {scene.location && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={10} />
                        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {scene.location}
                        </span>
                      </span>
                    )}
                    {typeof charCount === "number" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Clapperboard size={10} />
                        {charCount} char{charCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
