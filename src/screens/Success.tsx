import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Mail, ExternalLink } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { resolveRedirectUrl, APP_LABELS } from "@/lib/store";
import type React from "react";

const PRODUCTS = [
  { name: "Loop",          color: "var(--green)" },
  { name: "Messenger",     color: "var(--gold)" },
  { name: "PayRald",       color: "oklch(0.58 0.20 25)" },
  { name: "RALD Mail",     color: "oklch(0.52 0.15 150)" },
  { name: "Loop Business", color: "var(--gold)" },
  { name: "RALD AI",       color: "oklch(0.55 0.18 280)" },
];

export function Success() {
  const navigate        = useNavigate();
  const [state]         = useStore();
  const [secs, setSecs] = useState(2);
  const target          = resolveRedirectUrl(state);
  const appLabel        = state.appId ? (APP_LABELS[state.appId] ?? state.appId) : null;
  const reservedMail    = state.username ? `${state.username}@rald.me` : null;

  // Guard: must have a token (or username for registration flow) to be on this screen.
  // FIX: do NOT gate solely on username — users who logged in with email/phone have a
  // valid token but username may be "" until the server response is merged into state.
  // Bouncing them back to "/" caused the entire email/phone login flow to silently fail.
  useEffect(() => {
    if (!state.token && !state.username) { navigate("/"); return; }
  }, [state.token, state.username, navigate]);

  // ZERO-FRICTION-001: If token is missing the redirect fires anyway; the
  // destination app (Loop) will attempt its own SSO recovery via /sso/silent.
  // Do NOT show a warning — it exposes internal state and confuses users.

  // Auto-redirect countdown
  useEffect(() => {
    if (secs <= 0) { window.location.href = target; return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, target]);

  if (!state.token && !state.username) return null;

  return (
    <Shell step={5}>
      <div
        className="screen-enter"
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
      >
        {/* Animated logo + checkmark */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <div
            className="animate-ping"
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: 24,
              background: "oklch(0.52 0.15 150 / 0.18)",
            }}
            aria-hidden
          />
          <div style={{ background: "var(--surface)", borderRadius: 20, padding: 12, boxShadow: "var(--shadow)" }}>
            <RaldMark size={80} />
          </div>
          <div style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--green)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 0 0 4px var(--bg)",
          }}>
            <Check size={16} color="#fff" strokeWidth={3} />
          </div>
        </div>

        <h1>
          Welcome,{" "}
          <span className="text-green">
            {state.username ? `@${state.username}` : "back"}
          </span>
        </h1>
        <p className="text-muted text-sm mt-3">
          Your RALD Identity is ready. You now have access to the entire ecosystem.
        </p>

        {/* Reserved mail badge */}
        {reservedMail && (
          <div className="reserve-badge mt-5">
            <Mail size={14} color="var(--gold)" strokeWidth={2.5} />
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{reservedMail}</span>
            <span style={{ color: "var(--muted)" }}>reserved</span>
          </div>
        )}

        {/* Ecosystem products */}
        <div className="product-grid mt-6" style={{ width: "100%" }}>
          {PRODUCTS.map(p => (
            <div key={p.name} className="product-chip" style={{ "--chip-dot": p.color } as React.CSSProperties}>
              <span className="product-chip-dot" />
              {p.name}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          className="btn btn-primary mt-8"
          onClick={() => { window.location.href = target; }}
          style={{ width: "100%" }}
        >
          <ExternalLink size={18} />
          {appLabel ? `Enter ${appLabel}` : "Enter RALD"}
        </button>

        <p className="text-xs text-muted mt-3" style={{ fontVariantNumeric: "tabular-nums" }}>
          Redirecting in {secs}s…
        </p>
      </div>
    </Shell>
  );
}
