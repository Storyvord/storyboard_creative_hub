"use client";

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, UserCircle } from 'lucide-react';
import { useUserInfo } from '@/hooks/useUserInfo';
import { logout } from '@/services/auth';
import type { CreditTransaction, UserCreditInfo } from '@/services/user';

// ── helpers ─────────────────────────────────────────────────────────────────

function getInitialsColor(str: string): string {
  const colors = ['#16a34a', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#dc2626', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// "Fullness" ring — backend v3 wallet doesn't include `monthly_allocated`, so
// derive a coarse % from current_balance vs (current_balance + total_used).
// This gives a stable "remaining" hint that drops as the user spends.
function fullnessPct(balance: number, used: number): number {
  const reference = balance + Math.max(used, 0);
  if (reference <= 0) return 0;
  return Math.max(0, Math.min(100, (balance / reference) * 100));
}

function ringColor(balance: number): string {
  if (balance <= 0) return '#ef4444';   // red — out of credits
  if (balance < 5) return '#f59e0b';    // amber — low
  return '#22c55e';                     // green — healthy
}

// ── CreditRing ──────────────────────────────────────────────────────────────

function CreditRing({
  pct,
  color,
  imageUrl,
  initials,
  initialsColor,
}: {
  pct: number;
  color: string;
  imageUrl?: string | null;
  initials: string;
  initialsColor: string;
}) {
  const r = 18;
  const dash = 2 * Math.PI * r;
  const offset = dash * (1 - Math.min(pct, 100) / 100);

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" stroke="var(--border)" />
      <circle
        cx="22" cy="22" r={r}
        fill="none" strokeWidth="3"
        stroke={color}
        strokeDasharray={dash}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <foreignObject x="9" y="9" width="26" height="26">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: initialsColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {initials}
          </div>
        )}
      </foreignObject>
    </svg>
  );
}

// ── SkeletonRing ─────────────────────────────────────────────────────────────

function SkeletonRing() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0 animate-pulse">
      <circle cx="22" cy="22" r="18" fill="none" strokeWidth="3" stroke="var(--border)" />
      <circle cx="22" cy="22" r="13" fill="var(--surface-raised)" />
    </svg>
  );
}

// ── CreditsPopover ──────────────────────────────────────────────────────────

function txnAmountStyle(amount: number): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    color: amount >= 0 ? '#22c55e' : '#ef4444',
    fontVariantNumeric: 'tabular-nums',
  };
}

function CreditsPopover({
  profile,
  creditInfo,
  position,
  onClose,
}: {
  profile: { full_name?: string | null; email: string; job_title?: string | null };
  creditInfo: UserCreditInfo;
  position: 'above' | 'below-right';
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const { wallet, recent_transactions } = creditInfo;
  const pct = fullnessPct(wallet.current_balance, wallet.total_used);
  const color = ringColor(wallet.current_balance);

  const posStyle: React.CSSProperties =
    position === 'above'
      ? { position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 50 }
      : { position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 50 };

  // Show the 5 most recent transactions inline.
  const txnsToShow: CreditTransaction[] = recent_transactions.slice(0, 5);

  return (
    <div
      ref={ref}
      style={{
        ...posStyle,
        width: 280,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {profile.full_name || 'User'}
        </p>
        {profile.job_title && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{profile.job_title}</p>
        )}
      </div>

      {/* Tier */}
      {wallet.tier_name && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              background: 'var(--surface-raised)',
            }}
          >
            Tier: {wallet.tier_name}
          </span>
        </div>
      )}

      {/* Balance */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
            AI Credits
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {wallet.current_balance}
          </span>
        </div>
        <div style={{ background: 'var(--surface-raised)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
          <div
            style={{
              height: 6,
              borderRadius: 4,
              width: `${pct}%`,
              background: color,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Used: {wallet.total_used}
          </span>
          {wallet.total_purchased > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Purchased: {wallet.total_purchased}
            </span>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      {txnsToShow.length > 0 && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
            Recent activity
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {txnsToShow.map((txn) => (
              <li key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    title={txn.description}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {txn.transaction_type_display || txn.transaction_type}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {formatRelativeTime(txn.created_at)}
                  </p>
                </div>
                <span style={txnAmountStyle(txn.amount)}>
                  {txn.amount >= 0 ? `+${txn.amount}` : `${txn.amount}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Link
          href="/profile"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 8, fontSize: 13,
            color: 'var(--text-secondary)', textDecoration: 'none',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-raised)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <UserCircle size={14} style={{ flexShrink: 0 }} />
          Edit Profile
        </Link>
        <button
          onClick={() => { onClose(); logout(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 8, fontSize: 13,
            color: '#f87171', background: 'none', border: 'none',
            cursor: 'pointer', width: '100%', textAlign: 'left',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <LogOut size={14} style={{ flexShrink: 0 }} />
          Log out
        </button>
      </div>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface UserWidgetProps {
  variant: 'sidebar' | 'topbar';
  collapsed?: boolean;
}

// ── UserWidget ───────────────────────────────────────────────────────────────

export default function UserWidget({ variant, collapsed }: UserWidgetProps) {
  const { profile, creditInfo, loading } = useUserInfo();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const wallet = creditInfo?.wallet ?? null;
  const balance = wallet?.current_balance ?? 0;
  const used = wallet?.total_used ?? 0;
  const pct = fullnessPct(balance, used);
  const color = ringColor(balance);

  const displayName = profile?.full_name || 'User';
  const initials = profile ? getInitials(profile.full_name, profile.email) : '?';
  const initialsColor = profile ? getInitialsColor(profile.email) : '#555';

  if (loading) {
    if (variant === 'sidebar' && collapsed) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
          <SkeletonRing />
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
        <SkeletonRing />
        {variant === 'sidebar' && !collapsed && (
          <div style={{ flex: 1 }}>
            <div className="animate-pulse" style={{ height: 10, background: 'var(--surface-raised)', borderRadius: 4, marginBottom: 6, width: '70%' }} />
            <div className="animate-pulse" style={{ height: 8, background: 'var(--surface-raised)', borderRadius: 4, width: '50%' }} />
          </div>
        )}
        {variant === 'topbar' && (
          <div className="animate-pulse" style={{ height: 10, background: 'var(--surface-raised)', borderRadius: 4, width: 80 }} />
        )}
      </div>
    );
  }

  if (!profile) return null;

  // creditInfo may legitimately fail to load (e.g., new account before tier
  // allocation runs). Render a default-empty wallet instead of bailing out
  // so the rest of the widget still works.
  const safeCreditInfo: UserCreditInfo = creditInfo ?? {
    wallet: {
      current_balance: 0,
      total_used: 0,
      total_purchased: 0,
      last_reset: null,
      tier_id: null,
      tier_name: null,
      tier_user_type: null,
    },
    recent_transactions: [],
  };

  // ── Sidebar collapsed ──────────────────────────────────────────────────────
  if (variant === 'sidebar' && collapsed) {
    return (
      <div
        style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '6px 0' }}
        ref={containerRef}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          title={`${displayName} — ${balance} AI credits`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
        >
          <CreditRing
            pct={pct}
            color={color}
            imageUrl={profile.image}
            initials={initials}
            initialsColor={initialsColor}
          />
        </button>
        {open && (
          <CreditsPopover
            profile={profile}
            creditInfo={safeCreditInfo}
            position="above"
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Sidebar expanded ───────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <div style={{ position: 'relative' }} ref={containerRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            textAlign: 'left',
          }}
          className="hover:bg-[var(--surface-hover)] transition-colors"
        >
          <CreditRing
            pct={pct}
            color={color}
            imageUrl={profile.image}
            initials={initials}
            initialsColor={initialsColor}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 3,
              }}
            >
              {displayName}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, color, fontVariantNumeric: 'tabular-nums' }}>
                {balance} credits
              </span>
              {wallet?.tier_name && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  · {wallet.tier_name}
                </span>
              )}
            </div>
          </div>
        </button>
        {open && (
          <CreditsPopover
            profile={profile}
            creditInfo={safeCreditInfo}
            position="above"
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Topbar ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: 8,
        }}
        className="hover:bg-[var(--surface-hover)] transition-colors"
      >
        <CreditRing
          pct={pct}
          color={color}
          imageUrl={profile.image}
          initials={initials}
          initialsColor={initialsColor}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            maxWidth: 120,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </span>
        {wallet?.tier_name && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              background: 'var(--surface-raised)',
              whiteSpace: 'nowrap',
            }}
          >
            {wallet.tier_name}
          </span>
        )}
      </button>
      {open && (
        <CreditsPopover
          profile={profile}
          creditInfo={safeCreditInfo}
          position="below-right"
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
