// STO-1854 — Cost preflight panel.
//
// Shows {credits, usd, resolved_params} next to the wallet balance and flags an
// over-balance submit ("need X, have Y"). The backend 402 remains authoritative
// for the race case; this is client-side UX. Audio is free on both reference
// models (surcharge=0), noted in the help line.
import { Loader2, Zap, AlertTriangle } from "lucide-react";
import { VideoCostEstimate } from "@/types/video";

interface VideoCostPreflightPanelProps {
  estimate: VideoCostEstimate | null;
  loading: boolean;
  error: string | null;
  walletBalance: number | null;
}

export default function VideoCostPreflightPanel({
  estimate,
  loading,
  error,
  walletBalance,
}: VideoCostPreflightPanelProps) {
  const credits = estimate?.credits ?? 0;
  const overBalance =
    estimate != null && walletBalance != null && credits > walletBalance;

  const resolved = estimate?.resolved_params;

  return (
    <div className="bg-[var(--surface)] rounded-md p-2.5 border border-[var(--border)] flex flex-col gap-1.5 min-w-[200px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
          Estimated cost
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-[var(--text-muted)]" />}
      </div>

      {error ? (
        <p className="text-[10px] text-amber-400 leading-snug">{error}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 self-center" />
            <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
              {credits}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">credits</span>
            {estimate?.usd != null && (
              <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                ≈ ${estimate.usd.toFixed(2)}
              </span>
            )}
          </div>

          {resolved && (
            <div className="flex flex-wrap gap-1">
              {resolved.billed_seconds != null && (
                <span className="text-[9px] bg-[var(--surface-hover)] px-1 py-0.5 rounded text-[var(--text-secondary)] font-mono">
                  {resolved.billed_seconds}s billed
                </span>
              )}
              {resolved.resolution && (
                <span className="text-[9px] bg-[var(--surface-hover)] px-1 py-0.5 rounded text-[var(--text-secondary)] font-mono">
                  {resolved.resolution}
                </span>
              )}
              {resolved.mode && (
                <span className="text-[9px] bg-[var(--surface-hover)] px-1 py-0.5 rounded text-[var(--text-secondary)] font-mono">
                  {resolved.mode}
                </span>
              )}
            </div>
          )}

          {walletBalance != null && (
            <div
              className={`flex items-center gap-1.5 text-[10px] ${
                overBalance ? "text-red-400" : "text-[var(--text-muted)]"
              }`}
            >
              {overBalance && <AlertTriangle className="w-3 h-3" />}
              {overBalance
                ? `Need ${credits}, have ${walletBalance}`
                : `Balance: ${walletBalance} credits`}
            </div>
          )}

          <p className="text-[9px] text-[var(--text-muted)] leading-snug">
            Audio is included free. Final cost settles to actual duration.
          </p>
        </>
      )}
    </div>
  );
}
