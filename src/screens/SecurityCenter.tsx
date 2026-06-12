// RALD Identity — Security Center
// Route: /security
//
// Canonical security management screen for the RALD Account Portal.
// Shows: active sessions, trusted devices, revoke controls, sign-out-all.
//
// Authority: This is the ONLY place in RALD where sessions and devices are managed.
// Products must redirect here — they never manage sessions themselves.
//
// RALD Identity UI Consolidation — RALD Canonical Profile Authority
// LILCKY STUDIO LIMITED

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, Smartphone, Laptop2, Monitor,
  Trash2, CheckCircle2, Clock, Loader2, AlertTriangle,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  getSession,
  getSessions, revokeSession, revokeAllSessions,
  getDevices, removeDevice, trustDevice,
  logout,
  type SessionEntry, type DeviceEntry,
} from "@/lib/auth";
import { useStore, setState, resetFlow } from "@/lib/store";

// ── Device icon ────────────────────────────────────────────────────────────────

function DeviceIcon({ type }: { type?: string }) {
  if (type === "mobile") return <Smartphone size={18} color="var(--green)" />;
  if (type === "tablet") return <Smartphone size={18} color="var(--gold)" />;
  return <Monitor size={18} color="var(--muted)" />;
}

// ── Time formatter ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Session card ───────────────────────────────────────────────────────────────

function SessionCard({
  session, onRevoke, revoking,
}: {
  session: SessionEntry;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 16px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: "var(--green-dim)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Laptop2 size={17} color="var(--green)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.user_agent ? session.user_agent.slice(0, 40) : "Unknown device"}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
          {session.ip_address && (
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{session.ip_address}</span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--muted)" }}>
            <Clock size={10} />
            {relativeTime(session.last_seen_at ?? session.created_at)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRevoke(session.id)}
        disabled={revoking}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid oklch(0.88 0.06 25)",
          background: "oklch(0.97 0.02 25)",
          color: "var(--red)",
          fontSize: 12, fontWeight: 700,
          cursor: revoking ? "not-allowed" : "pointer",
          opacity: revoking ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {revoking ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : "Revoke"}
      </button>
    </div>
  );
}

// ── Device card ────────────────────────────────────────────────────────────────

function DeviceCard({
  device, onRemove, onTrust, removing, trusting,
}: {
  device:   DeviceEntry;
  onRemove: (id: string) => void;
  onTrust:  (id: string) => void;
  removing: boolean;
  trusting: boolean;
}) {
  const trusted = device.is_trusted ?? device.trusted;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 16px",
      background: "var(--surface)",
      border: `1px solid ${trusted ? "oklch(0.88 0.12 150 / 0.4)" : "var(--border)"}`,
      borderRadius: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: trusted ? "var(--green-dim)" : "oklch(0.94 0.01 150)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <DeviceIcon type={device.device_type} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>
            {device.device_name ?? "Unknown device"}
          </p>
          {trusted && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--green)", background: "var(--green-dim)", padding: "1px 6px", borderRadius: 100 }}>
              <CheckCircle2 size={9} />TRUSTED
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Last seen {relativeTime(device.last_seen_at)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {!trusted && (
          <button
            type="button"
            onClick={() => onTrust(device.id)}
            disabled={trusting}
            style={{
              padding: "5px 10px", borderRadius: 8,
              border: "1px solid var(--green)",
              background: "var(--green-dim)", color: "var(--green)",
              fontSize: 11, fontWeight: 700, cursor: trusting ? "not-allowed" : "pointer",
              opacity: trusting ? 0.5 : 1,
            }}
          >
            Trust
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(device.id)}
          disabled={removing}
          style={{
            padding: "5px 10px", borderRadius: 8,
            border: "1px solid oklch(0.88 0.06 25)",
            background: "oklch(0.97 0.02 25)", color: "var(--red)",
            fontSize: 11, fontWeight: 700, cursor: removing ? "not-allowed" : "pointer",
            opacity: removing ? 0.5 : 1,
          }}
        >
          {removing ? <Loader2 size={11} style={{ animation: "spin 0.7s linear infinite" }} /> : <Trash2 size={11} />}
        </button>
      </div>
    </div>
  );
}

// ── Security Center ────────────────────────────────────────────────────────────

export function SecurityCenter() {
  const navigate = useNavigate();
  const [store]  = useStore();

  const [sessions,  setSessions]  = useState<SessionEntry[]>([]);
  const [devices,   setDevices]   = useState<DeviceEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [revokingId,   setRevokingId]   = useState<string | null>(null);
  const [removingId,   setRemovingId]   = useState<string | null>(null);
  const [trustingId,   setTrustingId]   = useState<string | null>(null);
  const [revokeAll,    setRevokeAll]     = useState(false);
  const [revokeAllOk,  setRevokeAllOk]  = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const session = await getSession();
      if (!mounted) return;
      if (!session?.valid || !store.token) {
        setState({ token: null });
        resetFlow();
        navigate("/login", { replace: true });
        return;
      }

      const [sess, devs] = await Promise.allSettled([
        getSessions(store.token),
        getDevices(store.token),
      ]);

      if (!mounted) return;

      if (sess.status === "fulfilled") setSessions(sess.value ?? []);
      if (devs.status === "fulfilled") setDevices(devs.value ?? []);
      setLoading(false);
    }

    load().catch(() => { setError("Couldn't load security info."); setLoading(false); });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeSession(store.token!, id);
      setSessions(s => s.filter(x => x.id !== id));
    } catch {
      setError("Couldn't revoke that session.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRemoveDevice = async (id: string) => {
    setRemovingId(id);
    try {
      await removeDevice(store.token!, id);
      setDevices(d => d.filter(x => x.id !== id));
    } catch {
      setError("Couldn't remove that device.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleTrustDevice = async (id: string) => {
    setTrustingId(id);
    try {
      await trustDevice(store.token!, id);
      setDevices(d => d.map(x => x.id === id ? { ...x, is_trusted: true, trusted: true } : x));
    } catch {
      setError("Couldn't mark device as trusted.");
    } finally {
      setTrustingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Sign out all sessions? You'll need to sign in again on all devices.")) return;
    setRevokeAll(true);
    try {
      await revokeAllSessions(store.token!);
      setSessions([]);
      setRevokeAllOk(true);
      await logout(store.token!);
      setState({ token: null });
      resetFlow();
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch {
      setError("Couldn't sign out all sessions.");
    } finally {
      setRevokeAll(false);
    }
  };

  return (
    <Shell>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 32 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <Link to="/account" style={{ color: "var(--muted)", display: "flex" }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--green-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={18} color="var(--green)" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Security Center</h1>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Sessions · Devices · Sign-in security</p>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "oklch(0.97 0.04 25)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {revokeAllOk && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--green-dim)", borderRadius: 10, fontSize: 13, color: "var(--green)", fontWeight: 700 }}>
            <CheckCircle2 size={14} />
            All sessions revoked. Signing you out…
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <Loader2 size={24} color="var(--muted)" style={{ animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : (
          <>
            {/* ── Sessions ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em" }}>
                  ACTIVE SESSIONS ({sessions.length})
                </p>
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    disabled={revokeAll}
                    style={{
                      fontSize: 11, fontWeight: 700, color: "var(--red)",
                      background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    {revokeAll ? "Signing out…" : "Revoke all"}
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <p className="text-sm text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  No active sessions.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessions.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onRevoke={handleRevokeSession}
                      revoking={revokingId === s.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Devices ── */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
                TRUSTED DEVICES ({devices.length})
              </p>
              {devices.length === 0 ? (
                <p className="text-sm text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  No registered devices.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {devices.map(d => (
                    <DeviceCard
                      key={d.id}
                      device={d}
                      onRemove={handleRemoveDevice}
                      onTrust={handleTrustDevice}
                      removing={removingId === d.id}
                      trusting={trustingId === d.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Security tip ── */}
            <div style={{
              padding: "12px 14px", borderRadius: 12,
              background: "var(--green-dim)",
              border: "1px solid oklch(0.88 0.10 150 / 0.3)",
              fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
            }}>
              <span style={{ fontWeight: 700, color: "var(--green)" }}>Security tip: </span>
              Revoke sessions from devices you no longer use. Mark your personal devices as trusted to streamline future sign-ins.
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
