// STO-1854 — Video result tile.
//
// Mirrors the image tile's generating/error states (same spinner + red error
// box), but renders a <video controls poster> once the clip resolves. A
// "still rendering" state is shown for long jobs (motion-control / 1080p) so a
// raised poll timeout reads as in-progress rather than a false failure.
import { Loader2, AlertTriangle, Film } from "lucide-react";

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
}

interface VideoTileProps {
  item: VideoTileItem;
  /** "session" (large) or "history" (compact). */
  variant?: "session" | "history";
}

export default function VideoTile({ item, variant = "session" }: VideoTileProps) {
  const compact = variant === "history";
  const spinnerSize = compact ? "w-6 h-6" : "w-8 h-8";
  const textSize = compact ? "text-[10px]" : "text-xs";

  let body: React.ReactNode;
  if (item.isGenerating) {
    body = (
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
  } else if (item.isError) {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 px-4 text-center h-full w-full bg-red-950/10">
        <AlertTriangle className={`${compact ? "w-6 h-6" : "w-8 h-8"} text-red-500/70 shrink-0`} />
        <p className={`text-red-400 ${textSize} leading-relaxed ${compact ? "line-clamp-3" : ""}`} title={item.errorMessage}>
          {item.errorMessage}
        </p>
      </div>
    );
  } else if (item.video_url) {
    body = (
      <video
        src={item.video_url}
        poster={item.poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-contain bg-black"
      />
    );
  } else {
    body = (
      <div className="text-[var(--text-muted)]">
        <Film className={compact ? "w-6 h-6" : "w-8 h-8"} />
      </div>
    );
  }

  return body;
}
