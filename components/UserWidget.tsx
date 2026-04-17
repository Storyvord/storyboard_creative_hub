"use client";

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, UserCircle } from 'lucide-react';
import { useUserInfo } from '@/hooks/useUserInfo';
import { logout } from '@/services/auth';

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

// ── CreditRings ──────────────────────────────────────────────────────────────

function CreditRings({
  llmPct,
  imgPct,
  imageUrl,
  initials,
  initialsColor,
}: {
  llmPct: number;
  imgPct: number;
  imageUrl?: string | null;
  initials: string;
  initialsColor: string;
}) {
  const outerR = 20;
  const innerR = 14;
  const outerDash = 2 * Math.PI * outerR;
  const innerDash = 2 * Math.PI * innerR;
  const outerOffset = outerDash * (1 - Math.min(llmPct, 100) / 100);
  const innerOffset = innerDash * (1 - Math.min(imgPct, 100) / 100);

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
      {/* Outer track */}
      <circle cx="22" cy="22" r={outerR} fill="none" strokeWidth="2.5" stroke="var(--border)" />
      {/* Outer progress — LLM — green */}
      <circle
        cx="22" cy="22" r={outerR}
        fill="none" strokeWidth="2.5"
        stroke="#22c55e"
        strokeDasharray={outerDash}
        strokeDashoffset={outerOffset}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      {/* Inner track */}
      <circle cx="22" cy="22" r={innerR} fill="none" strokeWidth="2.5" stroke="var(--border)" />
      {/* Inner progress — Image — orange */}
      <circle
        cx="22" cy="22" r={innerR}
        fill="none" strokeWidth="2.5"
        stroke="#f97316"
        strokeDasharray={innerDash}
        strokeDashoffset={innerOffset}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      {/* Center avatar */}
      <foreignObject x="11" y="11" width="22" height="22">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: initialsColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
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
      <circle cx="22" cy="22" r="20" fill="none" strokeWidth="2.5" stroke="var(--border)" />
      <circle cx="22" cy="22" r="14" fill="none" strokeWidth="2.5" stroke="var(--border)" />
      <circle cx="22" cy="22" r="11" fill="var(--surface-raised)" />
    </svg>
  );
}

// ── CreditsPopover ────────────────────────────────────────────────────────────

function CreditsPopover({
  profile,
  tierInfo,
  llmBalance,
  llmAllocated,
  imgBalance,
  imgAllocated,
  position,
  onClose,
}: {
  profile: { full_name?: string | null; email: string; job_title?: string | null };
  tierInfo: { current_tier: { name: string } | null };
  llmBalance: number;
  llmAllocated: number;
  imgBalance: number;
  imgAllocated: number;
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

  const llmPct = llmAllocated > 0 ? Math.min((llmBalance / llmAllocated) * 100, 100) : 0;
  const imgPct = imgAllocated > 0 ? Math.min((imgBalance / imgAllocated) * 100, 100) : 0;

  const posStyle: React.CSSProperties =
    position === 'above'
      ? { position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 50 }
      : { position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 50 };

  return (
    <div
      ref={ref}
      style={{
        ...posStyle,
        width: 240,
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
      {tierInfo.current_tier && (
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
            Tier: {tierInfo.current_tier.name}
          </span>
        </div>
      )}

      {/* Credits */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* LLM */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              LLM Credits
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {llmBalance} / {llmAllocated}
            </span>
          </div>
          <div style={{ background: 'var(--surface-raised)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
            <div
              style={{
                height: 6,
                borderRadius: 4,
                width: `${llmPct}%`,
                background: '#22c55e',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Image */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
              Image Credits
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {imgBalance} / {imgAllocated}
            </span>
          </div>
          <div style={{ background: 'var(--surface-raised)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
            <div
              style={{
                height: 6,
                borderRadius: 4,
                width: `${imgPct}%`,
                background: '#f97316',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
  const { profile, tierInfo, loading } = useUserInfo();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive credit values
  const llmCredits = tierInfo?.credit_balances?.['llm'] ?? null;
  const imgCredits = tierInfo?.credit_balances?.['image'] ?? null;
  const llmBalance = llmCredits?.current_balance ?? 0;
  const llmAllocated = llmCredits?.monthly_allocated ?? 0;
  const imgBalance = imgCredits?.current_balance ?? 0;
  const imgAllocated = imgCredits?.monthly_allocated ?? 0;
  const llmPct = llmAllocated > 0 ? (llmBalance / llmAllocated) * 100 : 0;
  const imgPct = imgAllocated > 0 ? (imgBalance / imgAllocated) * 100 : 0;

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

  // ── Sidebar collapsed ──────────────────────────────────────────────────────
  if (variant === 'sidebar' && collapsed) {
    return (
      <div
        style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '6px 0' }}
        ref={containerRef}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          title={displayName}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
        >
          <CreditRings
            llmPct={llmPct}
            imgPct={imgPct}
            imageUrl={profile.image}
            initials={initials}
            initialsColor={initialsColor}
          />
        </button>
        {open && (
          <CreditsPopover
            profile={profile}
            tierInfo={tierInfo ?? { current_tier: null, credit_balances: {} }}
            llmBalance={llmBalance}
            llmAllocated={llmAllocated}
            imgBalance={imgBalance}
            imgAllocated={imgAllocated}
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
          <CreditRings
            llmPct={llmPct}
            imgPct={imgPct}
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
              <span style={{ fontSize: 10, color: '#22c55e' }}>
                LLM: {llmBalance}
              </span>
              <span style={{ fontSize: 10, color: '#f97316' }}>
                Img: {imgBalance}
              </span>
            </div>
          </div>
        </button>
        {open && (
          <CreditsPopover
            profile={profile}
            tierInfo={tierInfo ?? { current_tier: null, credit_balances: {} }}
            llmBalance={llmBalance}
            llmAllocated={llmAllocated}
            imgBalance={imgBalance}
            imgAllocated={imgAllocated}
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
        <CreditRings
          llmPct={llmPct}
          imgPct={imgPct}
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
        {tierInfo?.current_tier && (
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
            {tierInfo.current_tier.name}
          </span>
        )}
      </button>
      {open && (
        <CreditsPopover
          profile={profile}
          tierInfo={tierInfo ?? { current_tier: null, credit_balances: {} }}
          llmBalance={llmBalance}
          llmAllocated={llmAllocated}
          imgBalance={imgBalance}
          imgAllocated={imgAllocated}
          position="below-right"
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
