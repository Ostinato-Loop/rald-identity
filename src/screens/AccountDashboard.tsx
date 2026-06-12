// RALD Identity — Account Dashboard
// Route: /account
//
// THE canonical RALD Account Portal — equivalent to Google Account / Apple ID.
// All identity management happens here. Products redirect here for edits.
// This replaces the old Dashboard.tsx that simply forwarded to app.rald.cloud.
//
// Displays:
//   - Identity overview (username, name, verification state, trust level)
//   - Identity completeness score
//   - Quick navigation: Security, Privacy, Developer, Sessions, Devices
//   - Ecosystem app access summary
//   - Account actions: edit profile, change username, delete account
//
// RALD Identity UI Consolidation — one frontend, zero duplication.
// RALD Canonical Profile Authority — edit identity only here.
// LILCKY STUDIO LIMITED

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Smartphone, Key, Globe, Trash2, ArrowRight,
  CheckCircle2, Circle, AlertCircle, ExternalLink, LogOut, Loader2,
} from "lucide-react";
import { Shell }    from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import { getSession, getIdentityStatus, logout, type IdentityStatus } from "@/lib/auth";
import { useStore, setState, resetFlow } from "@/lib/store";

type SectionId = "overview" | "security" | "developer" | "privacy";

// ── Trust badge ───────────────────────────────────────────────────────────────

function TrustBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    elite:   { label: "Elite",   color: "var(--gold)",  bg: "var(--gold-dim)"  },
    full:    { label: "Full",    color: "var(--green)", bg: "var(--green-dim)" },
    basic:   { label: "Basic",   color: "var(--green)", bg: "var(--green-dim)" },
    none:    { label: "Unverified", color: "var(--muted)", bg: "oklch(0.94 0.01 150)" },
  };
  const t = map[level] ?? map.none!;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
      color: t.color, background: t.bg,
      padding: "2px 8px", borderRadius: 100,
    }}>
      {t.label.toUpperCase()}
    </span>
  );
}

// ── Verification state badge ───────────────────────────────────────────────────

function VerifBadge({ state }: { state: string }) {
  const map: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    BOTH:  { icon: CheckCircle2, color: "var(--green)", label: "Email + Phone verified" },
    EMAIL: { icon: CheckCircle2, color: "var(--green)", label: "Email verified" },
    PHONE: { icon: CheckCircle2, color: "var(--green)", label: "Phone verified" },
    NONE:  { icon: AlertCircle,  color: "var(--muted)", label: "Not verified" },
  };
  const v = map[state] ?? map.NONE!;
  const Icon = v.icon;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: v.color, fontSize: 12, fontWeight: 600 }}>
      <Icon size={13} />
      {v.label}
    </span>
  );
}

// ── Completeness ring ──────────────────────────────────────────────────────────

function CompletenessRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx={28} cy={28} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
      <circle
        cx={28} cy={28} r={r} fill="none"
        stroke={score >= 80 ? "var(--green)" : score >= 50 ? "var(--gold)" : "var(--muted)"}
        strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dasharray 0.4s ease" }}
      />
      <text x={28} y={32} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
        {score}%
      </text>
    </svg>
  );
}

// ── Quick action card ──────────────────────────────────────────────────────────

function ActionCard({
  icon: Icon, title, desc, to, external, danger,
}: {
  icon:      typeof Shield;
  title:     string;
  desc:      string;
  to:        string;
  external?: boolean;
  danger?:   boolean;
}) {
  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px",
      background: "var(--surface)",
      border: `1px solid ${danger ? "oklch(0.88 0.06 25)" : "var(--border)"}`,
      borderRadius: 12,
      cursor: "pointer",
      transition: "border-color 0.15s, box-shadow 0.15s",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.borderColor = danger ? "var(--red)" : "var(--green)";
      (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.borderColor = danger ? "oklch(0.88 0.06 25)" : "var(--border)";
      (e.currentTarget as HTMLElement).style.boxShadow = "none";
    }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: danger ? "oklch(0.95 0.04 25)" : "var(--green-dim)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={danger ? "var(--red)" : "var(--green)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: danger ? "var(--red)" : "var(--text)" }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{desc}</p>
      </div>
      {external
        ? <ExternalLink size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
        : <ArrowRight size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
      }
    </div>
  );

  if (external) {
    return <a href={to} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a>;
  }
  return <Link to={to} style={{ textDecoration: "none" }}>{inner}</Link>;
}

// ── Completeness item ──────────────────────────────────────────────────────────

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      {done
        ? <CheckCircle2 size={15} color="var(--green)" style={{ flexShrink: 0 }} />
        : <Circle size={15} color="var(--border)" style={{ flexShrink: 0 }} />
      }
      <span style={{ color: done ? "var(--text)" : "var(--muted)" }}>{label}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AccountDashboard() {
  const navigate        = useNavigate();
  const [store]         = useStore();

  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [signingOut, setSO]     = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Validate session
      const session = await getSession();
      if (!mounted) return;

      if (!session?.valid || !store.token) {
        setState({ token: null });
        resetFlow();
        navigate("/login", { replace: true });
        return;
      }

      // Fetch identity status for completeness score + required actions
      const status = await getIdentityStatus(store.token);
      if (!mounted) return;

      setIdentity(status);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    setSO(true);
    if (store.token) await logout(store.token);
    setState({ token: null });
    resetFlow();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 14 }}>
          <RaldMark size={52} />
          <Loader2 size={18} color="var(--muted)" style={{ animation: "spin 0.7s linear infinite" }} />
          <p className="text-sm text-muted">Loading your account…</p>
        </div>
      </Shell>
    );
  }

  // Compute completeness score from identity status
  const c = identity?.completeness;
  const checks = [
    c?.has_username,
    c?.has_verified_email || c?.has_verified_phone,
    c?.has_region,
    c?.has_reserved_mail,
    c?.has_profile,
    c?.has_trust_profile,
  ];
  const score = c
    ? Math.round((checks.filter(Boolean).length / checks.length) * 100)
    : 0;

  const username      = identity?.username ?? store.username ?? null;
  const trustLevel    = identity?.trust_level ?? "none";
  const verifyState   = (identity as unknown as { verification_state?: string })?.verification_state ?? "NONE";
  const reservedMail  = identity?.reserved_email_address;

  const requiredActions = identity?.required_actions ?? [];

  return (
    <Shell>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 32 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <RaldMark size={36} />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: "var(--muted)",
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 10px", borderRadius: 8,
            }}
          >
            {signingOut
              ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} />
              : <LogOut size={14} />
            }
            Sign out
          </button>
        </div>

        {/* ── Identity card ── */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "20px 20px 16px",
          boxShadow: "var(--shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            {/* Avatar placeholder */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "var(--green-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "var(--green)",
            }}>
              {username ? username[0]!.toUpperCase() : "?"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  {username ? `@${username}` : "No username yet"}
                </span>
                <TrustBadge level={trustLevel} />
              </div>
              {reservedMail && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{reservedMail}</p>
              )}
              <div style={{ marginTop: 6 }}>
                <VerifBadge state={verifyState} />
              </div>
            </div>
          </div>

          {/* Completeness bar */}
          {score < 100 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: "var(--muted)" }}>Identity completeness</span>
                <span style={{ fontWeight: 700, color: score >= 80 ? "var(--green)" : "var(--gold)" }}>{score}%</span>
              </div>
              <div style={{ height: 6, background: "var(--border)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 100,
                  width: `${score}%`,
                  background: score >= 80 ? "var(--green)" : "var(--gold)",
                  transition: "width 0.4s ease",
                }} />
              </div>

              {/* Checklist */}
              {c && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                  <CheckItem done={!!c.has_username}                             label="Username claimed" />
                  <CheckItem done={!!(c.has_verified_email || c.has_verified_phone)} label="Identity verified" />
                  <CheckItem done={!!c.has_region}                               label="Region set" />
                  <CheckItem done={!!c.has_reserved_mail}                        label="RALD Mail reserved" />
                </div>
              )}

              {/* Required actions */}
              {requiredActions.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {requiredActions.map((a) => (
                    <a
                      key={a.action}
                      href={a.url}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 12, color: "var(--green)", fontWeight: 700,
                        textDecoration: "none", marginTop: 6,
                      }}
                    >
                      <ArrowRight size={13} />
                      {a.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {score === 100 && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 10,
              background: "var(--green-dim)",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 600, color: "var(--green)",
            }}>
              <CheckCircle2 size={14} />
              Identity complete — you're fully set up across RALD.
            </div>
          )}
        </div>

        {/* ── Account actions ── */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
            ACCOUNT SETTINGS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ActionCard
              icon={Shield}
              title="Security & Sessions"
              desc="Manage devices, active sessions, and sign-in security"
              to="/security"
            />
            <ActionCard
              icon={Smartphone}
              title="Trusted Devices"
              desc="View and remove devices that have access to your account"
              to="/security"
            />
            <ActionCard
              icon={Key}
              title="Developer & API"
              desc="API keys, developer identity, and integrations"
              to="/developer"
            />
            <ActionCard
              icon={Globe}
              title="Privacy & Permissions"
              desc="Control your data, connected apps, and visibility"
              to="/privacy"
            />
          </div>
        </div>

        {/* ── Ecosystem ── */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
            RALD ECOSYSTEM
          </p>
          <ActionCard
            icon={ExternalLink}
            title="Go to app.rald.cloud"
            desc="RALD hub — Loop, Messenger, Mail, PayRald, and more"
            to={store.token
              ? `https://app.rald.cloud?rald_token=${encodeURIComponent(store.token)}&app_id=rald-app`
              : "https://app.rald.cloud"
            }
            external
          />
        </div>

        {/* ── Danger zone ── */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
            DANGER ZONE
          </p>
          <ActionCard
            icon={Trash2}
            title="Delete Account"
            desc="Permanently remove your identity and all data from RALD"
            to="/privacy"
            danger
          />
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <p className="text-xs text-muted">
            Your RALD Account is managed exclusively at{" "}
            <span style={{ fontWeight: 700, color: "var(--text)" }}>profiles.rald.cloud</span>
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
            <a href="https://rald.cloud/privacy" style={{ fontSize: 11, color: "var(--muted)" }}>Privacy</a>
            <a href="https://rald.cloud/terms"   style={{ fontSize: 11, color: "var(--muted)" }}>Terms</a>
            <a href="https://rald.cloud/help"    style={{ fontSize: 11, color: "var(--muted)" }}>Help</a>
          </div>
        </div>
      </div>
    </Shell>
  );
}
