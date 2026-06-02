// STO-1854 — Video result tile.
//
// Mirrors the image tile's generating/error states (same spinner + red error
// box), but renders a <video controls poster> once the clip resolves. A
// "still rendering" state is shown for long jobs (motion-control / 1080p) so a
// raised poll timeout reads as in-progress rather than a false failure.
//
// The `history` variant additionally owns a compact footer mirroring the image
// history tile (prompt tooltip + aspect_ratio / duration / model badges) plus a
// "Details" popover listing ALL generation params, the media roles used,
// elements, and character ids — so a persisted clip is fully self-describing.
import { useState } from "react";
import { Loader2, AlertTriangle, Film, Info, Play } from "lucide-react";

export interface VideoTileItem {
  isGenerating?: boolean;
  isError?: boolean;
  errorMessage?: string;
  /** True once the poll timeout is hit but the job hasn't terminally failed. */
  stillRendering?: boolean;
  video_url?: string | null;
  poster?: string | null;
  aspect_ratio?: string;
  prompt?: string;
  // ── STO-1854 history-variant provenance (all optional). ──
  /** Model display name / slug for the badge. */
  model_name?: string | null;
  /** Generation params (real duration lives here, NOT a clamped column). */
  params?: Record<string, unknown> | null;
  /** `{role: [{url, ...}]}` media roles used for the clip. */
  media?: Record<string, { url: string }[]> | null;
  elements?: unknown[] | null;
  character_ids?: (string | number)[] | null;
}

interface VideoTileProps {
  item: VideoTileItem;
  /** "session" (large) or "history" (compact). */
  variant?: "session" | "history";
  /** History variant only: parsed aspect ratio for the body container. */
  aspect?: { w: number; h: number };
}

// Pull a human duration (seconds) out of params without trusting the clamped
// `duration_seconds` column. Accepts `duration`, `duration_seconds`, or
// `seconds` as a number or numeric string.
// NB: `params.duration` carries the REAL requested duration; the DB
// `duration_seconds` column is clamped and display-only — never read it as the
// source of truth here (doing so would regress real-duration reporting).
function durationFromParams(params?: Record<string, unknown> | null): string | null {
  if (!params) return null;
  for (const key of ["duration", "duration_seconds", "seconds"]) {
    const raw = params[key];
    if (raw == null) continue;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isFinite(n) && n > 0) return `${n % 1 === 0 ? n : n.toFixed(1)}s`;
    // Some providers express duration as an enum string (e.g. "5s"); echo it.
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return null;
}

function formatParamValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Poster (thumbnail) WITHOUT loading the video or any server-side processing:
// reuse the clip's own source/start frame. Text-to-video clips have no source
// image → null → a placeholder is shown instead.
function posterFromItem(item: VideoTileItem): string | null {
  if (item.poster) return item.poster;
  const m = item.media ?? {};
  for (const role of ["image", "start_image"]) {
    const url = m[role]?.[0]?.url;
    if (url) return url;
  }
  return null;
}

// YouTube-style lazy player: shows a poster/placeholder + play button and does
// NOT mount the <video> (so the browser fetches NO video bytes) until the user
// clicks play. This is what stops a grid of history videos from all loading at
// once and stalling image loads.
function LazyVideo({ item, compact }: { item: VideoTileItem; compact: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const poster = posterFromItem(item);

  if (playing) {
    return (
      <video
        src={item.video_url ?? undefined}
        poster={poster ?? undefined}
        controls
        autoPlay
        playsInline
        preload="auto"
        className="w-full h-full object-contain bg-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
      }}
      className="group relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      title="Play video"
      aria-label="Play video"
    >
      {poster && !posterFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={item.prompt || "Video thumbnail"}
          loading="lazy"
          decoding="async"
          onError={() => setPosterFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface)] to-black text-[var(--text-muted)]">
          <Film className={compact ? "w-6 h-6" : "w-10 h-10"} />
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={`flex items-center justify-center rounded-full bg-black/55 group-hover:bg-emerald-600/85 backdrop-blur transition-colors ${
            compact ? "w-9 h-9" : "w-12 h-12"
          }`}
        >
          <Play className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-white translate-x-0.5`} fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

function VideoBody({
  item,
  compact,
}: {
  item: VideoTileItem;
  compact: boolean;
}) {
  const spinnerSize = compact ? "w-6 h-6" : "w-8 h-8";
  const textSize = compact ? "text-[10px]" : "text-xs";

  if (item.isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[var(--background)]">
        <Loader2 className={`${spinnerSize} text-emerald-500 animate-spin mb-2`} />
        <span className={`text-emerald-400 ${textSize} font-medium animate-pulse`}>
          {item.stillRendering ? "Still rendering…" : "Rendering video…"}
        </span>
        {item.stillRendering && !compact && (
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            High-res / motion-control clips can take a few minutes.
          </span>
        )}
      </div>
    );
  }
  if (item.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center h-full w-full bg-red-950/10">
        <AlertTriangle className={`${compact ? "w-6 h-6" : "w-8 h-8"} text-red-500/70 shrink-0`} />
        <p className={`text-red-400 ${textSize} leading-relaxed ${compact ? "line-clamp-3" : ""}`} title={item.errorMessage}>
          {item.errorMessage}
        </p>
      </div>
    );
  }
  if (item.video_url) {
    return <LazyVideo item={item} compact={compact} />;
  }
  return (
    <div className="text-[var(--text-muted)]">
      <Film className={compact ? "w-6 h-6" : "w-8 h-8"} />
    </div>
  );
}

// History footer + details popover. Lives behind the history variant only.
function HistoryFooter({ item }: { item: VideoTileItem }) {
  const [showDetails, setShowDetails] = useState(false);
  const duration = durationFromParams(item.params);
  const params = item.params ?? {};
  const paramEntries = Object.entries(params);
  const mediaRoles = item.media ?? {};
  const mediaEntries = Object.entries(mediaRoles).filter(
    ([, files]) => Array.isArray(files) && files.length > 0,
  );
  const elements = Array.isArray(item.elements) ? item.elements : [];
  const characterIds = Array.isArray(item.character_ids) ? item.character_ids : [];
  const hasDetails =
    paramEntries.length > 0 ||
    mediaEntries.length > 0 ||
    elements.length > 0 ||
    characterIds.length > 0;

  return (
    <div className="relative p-2 flex flex-col border-t border-[var(--border)] h-[72px] flex-shrink-0">
      <p className="text-[10px] text-[#ccc] line-clamp-2" title={item.prompt || undefined}>
        {item.prompt || "Generated video"}
      </p>

      <div className="flex flex-wrap items-center gap-1 mt-auto overflow-hidden">
        <span className="text-[8px] bg-[var(--surface-hover)] px-1 py-0.5 rounded text-[var(--text-secondary)] font-mono whitespace-nowrap">
          {item.aspect_ratio || "16:9"}
        </span>
        {duration && (
          <span className="text-[8px] bg-[var(--surface-hover)] px-1 py-0.5 rounded text-[var(--text-secondary)] font-mono whitespace-nowrap">
            {duration}
          </span>
        )}
        {item.model_name && (
          <span
            className="text-[8px] bg-[var(--surface-hover)] px-1 py-0.5 rounded text-[var(--text-secondary)] truncate max-w-[90px]"
            title={item.model_name}
          >
            {item.model_name}
          </span>
        )}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            title="Generation details"
            aria-expanded={showDetails}
            className={`ml-auto flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded transition-colors ${
              showDetails
                ? "bg-emerald-600 text-white"
                : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-emerald-400"
            }`}
          >
            <Info className="w-2.5 h-2.5" /> Details
          </button>
        )}
      </div>

      {showDetails && hasDetails && (
        <div
          className="absolute bottom-full right-1 mb-1 z-30 w-64 max-h-72 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-2.5 text-[10px] text-[var(--text-secondary)] space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {paramEntries.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Parameters
              </p>
              <div className="space-y-0.5">
                {paramEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="font-mono text-[var(--text-muted)] shrink-0">{key}</span>
                    <span className="text-right break-all text-[var(--text-primary)]">
                      {formatParamValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mediaEntries.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Media roles
              </p>
              <div className="space-y-0.5">
                {mediaEntries.map(([role, files]) => (
                  <div key={role} className="flex justify-between gap-2">
                    <span className="font-mono text-[var(--text-muted)]">{role}</span>
                    <span className="text-[var(--text-primary)]">
                      {(files as { url: string }[]).length} file
                      {(files as { url: string }[]).length === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {elements.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Elements
              </p>
              <p className="text-[var(--text-primary)]">{elements.length}</p>
            </div>
          )}

          {characterIds.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Characters
              </p>
              <p className="text-[var(--text-primary)] break-all font-mono">
                {characterIds.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoTile({ item, variant = "session", aspect }: VideoTileProps) {
  const compact = variant === "history";

  // Session (and any non-history) variant: render the body only, exactly as the
  // surrounding container expects — UNCHANGED behavior.
  if (!compact) {
    return <VideoBody item={item} compact={false} />;
  }

  // History variant: self-contained tile (aspect-ratio body + compact footer).
  const w = aspect?.w ?? 16;
  const h = aspect?.h ?? 9;
  return (
    <>
      <div
        className="bg-[var(--background)] relative flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: `${w}/${h}` }}
      >
        <VideoBody item={item} compact />
      </div>
      <HistoryFooter item={item} />
    </>
  );
}
