// RALD Identity — Privacy & Consent Center V1
// Route: /privacy
//
// Two exported components:
//   1. ConsentBanner  — first-visit bottom sheet (shown in App.tsx on all pages)
//   2. Privacy        — full consent & data-transparency page at /privacy
//
// Backend: auth.rald.cloud endpoints
//   GET  /privacy/me           — fetch current prefs + stats
//   PATCH /privacy/permissions — update toggles
//   GET  /privacy/export       — download data as JSON
//   POST /privacy/delete-request { confirm: true }
//
// Consent stored in localStorage("rald.consent.v1") so it survives sessions.
// LILCKY STUDIO LIMITED

import { useState, useEffect, useCallback } from "react";
import { useNavigate }                        from "react-router-dom";
import { Shell }                              from "@/components/Shell";
import { useStore }                           from "@/lib/store";
import {
  Shield, Download, Trash2, ChevronRight, X,
  Eye, Smartphone, Activity, CheckCircle2, Lock,
  ToggleLeft, ToggleRight, ArrowLeft,
} from "lucide-react";

const AUTH    = (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ?? "https://auth.rald.cloud";
const CONSENT_KEY = "rald.consent.v1";
const BANNER_KEY  = "rald.consent.banner.dismissed";

// ── Consent shape ──────────────────────────────────────────────────────────────
interface ConsentPrefs {
  personalization:  boolean;
  communications:   boolean;
  marketing:        boolean;
}

const DEFAULT_CONSENT: ConsentPrefs = {
  personalization: true,
  communications:  true,
  marketing:       false,
};

function loadConsent(): ConsentPrefs {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? { ...DEFAULT_CONSENT, ...(JSON.parse(raw) as Partial<ConsentPrefs>) } : { ...DEFAULT_CONSENT };
  } catch { return { ...DEFAULT_CONSENT }; }
}

function saveConsent(prefs: ConsentPrefs) {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
}

// ── Privacy API helpers ────────────────────────────────────────────────────────
async function fetchPrivacyMe(token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${AUTH}/privacy/me`, { credentials: "include", headers });
  if (!res.ok) throw new Error("Could not load privacy overview");
  return res.json() as Promise<{
    data_collected:  Record<string, unknown>;
    connected_apps:  string[];
    active_sessions: number;
    permissions:     { profile_visible: boolean; activity_tracking: boolean; marketing_emails: boolean };
  }>;
}

async function patchPermissions(token: string | null, patch: Partial<ConsentPrefs & { profile_visible: boolean; activity_tracking: boolean; marketing_emails: boolean }>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${AUTH}/privacy/permissions`, {
    method: "PATCH", credentials: "include", headers,
    body: JSON.stringify(patch),
  });
}

async function requestExport(token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${AUTH}/privacy/export`, { credentials: "include", headers });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `rald-data-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function requestDeletion(token: string | null, reason?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${AUTH}/privacy/delete-request`, {
    method: "POST", credentials: "include", headers,
    body: JSON.stringify({ confirm: true, reason }),
  });
  const data = await res.json() as { ok?: boolean; scheduled_at?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Deletion request failed");
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ConsentBanner — first-visit bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
export function ConsentBanner() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so the page renders before the banner slides up
    const t = setTimeout(() => {
      if (!localStorage.getItem(BANNER_KEY)) setVisible(true);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(BANNER_KEY, "1");
    setVisible(false);
  }

  function learnMore() {
    dismiss();
    navigate("/privacy");
  }

  return (
    <div className="consent-backdrop" role="dialog" aria-modal="true" aria-label="Privacy notice">
      <div className="consent-sheet animate-sheet-up">
        <button className="consent-close" onClick={dismiss} aria-label="Dismiss">
          <X size={18} />
        </button>

        <div className="consent-header">
          <div className="consent-icon-wrap">
            <Shield size={22} color="var(--green)" />
          </div>
          <div>
            <p className="consent-title">Your Privacy &amp; Trust</p>
            <p className="consent-subtitle">Built in Africa · Works on any network</p>
          </div>
        </div>

        <p className="consent-body">
          RALD uses essential technologies to keep you signed in, protect your account,
          secure your devices, and improve reliability.{" "}
          <strong>We never sell your personal information.</strong>
        </p>

        <div className="consent-essentials">
          {["Authentication", "Account Security", "Fraud Prevention", "Device Protection"].map(item => (
            <div key={item} className="consent-essential-item">
              <CheckCircle2 size={14} color="var(--green)" style={{ flexShrink: 0 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="consent-actions">
          <button className="btn btn-primary" onClick={dismiss} style={{ flex: 2 }}>
            Continue
          </button>
          <button
            className="btn"
            onClick={learnMore}
            style={{ flex: 1, background: "var(--border)", color: "var(--text)", boxShadow: "none" }}
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Privacy — full consent & data-transparency page
// ─────────────────────────────────────────────────────────────────────────────
export function Privacy() {
  const navigate = useNavigate();
  const [store]  = useStore();
  const token    = store.token;

  const [consent, setConsent]         = useState<ConsentPrefs>(() => loadConsent());
  const [stats, setStats]             = useState<{ connected_apps: number; active_sessions: number } | null>(null);
  const [saving, setSaving]           = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [saved, setSaved]             = useState(false);

  // Load privacy overview from backend (only if authenticated)
  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchPrivacyMe(token);
      setStats({ connected_apps: data.connected_apps.length, active_sessions: data.active_sessions });
    } catch { /* silently fail — stats are cosmetic */ }
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleToggle(key: keyof ConsentPrefs) {
    const updated = { ...consent, [key]: !consent[key] };
    setConsent(updated);
    saveConsent(updated);

    // Sync to backend if authenticated
    if (token) {
      setSaving(true);
      try {
        await patchPermissions(token, {
          activity_tracking: updated.personalization,
          marketing_emails:  updated.marketing,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { /* non-critical */ }
      finally { setSaving(false); }
    }
  }

  async function handleExport() {
    if (!token) { setError("Sign in to export your data."); return; }
    setExporting(true);
    setError(null);
    try {
      await requestExport(token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!token) { setError("Sign in to delete your account."); return; }
    setDeleting(true);
    setError(null);
    try {
      const res = await requestDeletion(token, "User request");
      setDeleteResult(res.scheduled_at ?? "");
      setDeleteConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Shell>
      <div className="privacy-page">

        {/* Header */}
        <div className="privacy-nav">
          <button className="btn-ghost" onClick={() => navigate(-1)} style={{ padding: "6px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={16} /> Back
          </button>
          {saved && <span className="privacy-saved-badge">Saved ✓</span>}
          {saving && <span className="privacy-saved-badge" style={{ color: "var(--muted)" }}>Saving…</span>}
        </div>

        <div className="mt-4">
          <div className="privacy-hero">
            <div className="privacy-hero-icon">
              <Shield size={28} color="var(--green)" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Privacy &amp; Trust</h1>
              <p className="text-muted text-sm">Your data. Your controls. Always.</p>
            </div>
          </div>
        </div>

        {/* Stats bar — only shown when authenticated */}
        {stats && (
          <div className="privacy-stats-row">
            <div className="privacy-stat">
              <Smartphone size={16} color="var(--green)" />
              <span>{stats.active_sessions} active session{stats.active_sessions !== 1 ? "s" : ""}</span>
            </div>
            <div className="privacy-stat">
              <Activity size={16} color="var(--gold)" />
              <span>{stats.connected_apps} connected app{stats.connected_apps !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}

        {/* Essential Services */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Lock size={15} color="var(--green)" />
            <span>Essential Services</span>
            <span className="privacy-always-on">Always on</span>
          </div>
          <div className="privacy-card">
            {["Authentication & Sessions", "Account Security", "Fraud Prevention", "Device Fingerprinting"].map(item => (
              <div key={item} className="privacy-row-locked">
                <CheckCircle2 size={15} color="var(--green)" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="privacy-note">These cannot be disabled. They are required for RALD to function safely.</p>
        </div>

        {/* Consent toggles */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Eye size={15} color="var(--gold)" />
            <span>Your Choices</span>
          </div>

          {([
            {
              key:   "personalization" as const,
              label: "Personalisation",
              desc:  "Suggested rooms, communities, and creators based on your activity.",
            },
            {
              key:   "communications" as const,
              label: "Communications",
              desc:  "Email and SMS updates about your account and new features.",
            },
            {
              key:   "marketing" as const,
              label: "Marketing",
              desc:  "RALD promotions and partner offers. Off by default.",
            },
          ] as const).map(({ key, label, desc }) => (
            <button
              key={key}
              type="button"
              className="privacy-toggle-row"
              onClick={() => handleToggle(key)}
              aria-pressed={consent[key]}
            >
              <div className="privacy-toggle-left">
                <span className="privacy-toggle-label">{label}</span>
                <span className="privacy-toggle-desc">{desc}</span>
              </div>
              <div className={`privacy-toggle-icon ${consent[key] ? "on" : "off"}`}>
                {consent[key]
                  ? <ToggleRight size={32} color="var(--green)" />
                  : <ToggleLeft  size={32} color="var(--muted)" />
                }
              </div>
            </button>
          ))}
        </div>

        {/* Data Transparency */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Download size={15} color="var(--text)" />
            <span>Data Transparency</span>
          </div>

          {token ? (
            <div className="privacy-card privacy-card-actions">
              <button className="privacy-action-row" onClick={handleExport} disabled={exporting}>
                <Download size={16} color="var(--text)" />
                <div>
                  <span className="privacy-action-label">
                    {exporting ? "Preparing export…" : "Export My Data"}
                  </span>
                  <span className="privacy-action-desc">Download everything RALD holds about you as JSON.</span>
                </div>
                <ChevronRight size={16} color="var(--muted)" />
              </button>

              <div className="privacy-divider" />

              {!deleteResult ? (
                !deleteConfirm ? (
                  <button className="privacy-action-row" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 size={16} color="var(--red)" />
                    <div>
                      <span className="privacy-action-label" style={{ color: "var(--red)" }}>Delete My Account</span>
                      <span className="privacy-action-desc">Permanently remove your identity, data, and sessions.</span>
                    </div>
                    <ChevronRight size={16} color="var(--muted)" />
                  </button>
                ) : (
                  <div className="privacy-delete-confirm">
                    <p className="privacy-delete-warning">
                      <Trash2 size={14} color="var(--red)" style={{ flexShrink: 0 }} />
                      Your account will be scheduled for deletion in{" "}
                      <strong>30 days</strong>. You can cancel during this period.
                    </p>
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button
                        className="btn"
                        onClick={() => setDeleteConfirm(false)}
                        style={{ flex: 1, background: "var(--border)", color: "var(--text)", boxShadow: "none", height: 44 }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{ flex: 1, background: "var(--red)", height: 44 }}
                      >
                        {deleting ? "Processing…" : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="privacy-delete-scheduled">
                  <CheckCircle2 size={18} color="var(--green)" />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>Deletion scheduled</p>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Your account will be deleted on{" "}
                      {new Date(deleteResult).toLocaleDateString("en-NG", { dateStyle: "long" })}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="privacy-card privacy-sign-in-nudge">
              <Shield size={20} color="var(--muted)" />
              <p>Sign in to view your data, export a copy, or request account deletion.</p>
            </div>
          )}

          {error && <p className="field-error mt-3">{error}</p>}
        </div>

        {/* Data policy footer */}
        <div className="privacy-footer">
          <p><strong>Data Residency:</strong> Nigeria (af-south-1)</p>
          <p><strong>Retention:</strong> Account data held for 90 days after deletion request.</p>
          <p><strong>Data Controller:</strong> LILCKY STUDIO LIMITED</p>
          <p style={{ marginTop: 8 }}>
            Questions?{" "}
            <a href="mailto:privacy@rald.cloud" className="text-green">privacy@rald.cloud</a>
          </p>
        </div>
      </div>
    </Shell>
  );
}
