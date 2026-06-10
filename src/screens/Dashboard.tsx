// RALD Identity — Dashboard
// Route: /dashboard
// Shown when a user lands on profiles.rald.cloud directly (no app_id / redirect_to)
// after a successful registration or login flow.
// LILCKY STUDIO LIMITED

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell }       from "@/components/Shell";
import { RaldMark }    from "@/components/Logo";
import { useStore, setState } from "@/lib/store";
import { getSession }  from "@/lib/auth";
import { ExternalLink, Shield, Loader2 } from "lucide-react";

const APPS = [
  { id: "loop",      label: "Loop",      desc: "Social feed",       url: "https://loop.rald.cloud",      color: "var(--green)" },
  { id: "messenger", label: "Messenger", desc: "Private messages",  url: "https://messenger.rald.cloud",  color: "var(--gold)"  },
  { id: "pay",       label: "Pay",       desc: "Send money",        url: "https://pay.rald.cloud",        color: "var(--red)"   },
] as const;

export function Dashboard() {
  const navigate             = useNavigate();
  const [store]              = useStore();
  const [validating, setVal] = useState(true);

  // Validate server session on mount — clears stale in-memory tokens
  useEffect(() => {
    let mounted = true;
    setVal(true);
    getSession().then(result => {
      if (!mounted) return;
      setVal(false);
      if (!result?.ok) {
        // Server session expired or invalid — wipe token and redirect to login
        setState({ token: null });
        navigate("/login", { replace: true });
      }
    });
    return () => { mounted = false; };
  }, [navigate]);

  // Belt-and-suspenders: if no in-memory token while session check runs, redirect
  useEffect(() => {
    if (!store.token && !validating) navigate("/login", { replace: true });
  }, [store.token, validating, navigate]);

  if (validating) {
    return (
      <Shell>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "var(--muted)",
          }}
        >
          <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
          <span className="text-sm">Verifying session…</span>
        </div>
      </Shell>
    );
  }

  if (!store.token) return null;

  return (
    <Shell>
      <div className="dashboard">

        {/* Identity header */}
        <div className="dashboard-header">
          <div className="dashboard-logo">
            <RaldMark size={56} />
          </div>
          <div className="dashboard-id">
            {store.username
              ? <span className="dashboard-username">@{store.username}</span>
              : <span className="dashboard-username text-muted">Welcome to RALD</span>
            }
            <p className="text-muted text-xs mt-2" style={{ marginTop: 4 }}>
              Your identity is active across the RALD ecosystem.
            </p>
          </div>
        </div>

        {/* App links */}
        <div className="mt-8">
          <p className="text-xs" style={{ fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
            RALD Apps
          </p>
          <div className="dashboard-apps">
            {APPS.map(app => (
              <a
                key={app.id}
                href={app.url}
                className="dashboard-app-card"
                style={{ "--app-color": app.color } as React.CSSProperties}
              >
                <div className="dashboard-app-dot" />
                <div>
                  <p className="dashboard-app-label">{app.label}</p>
                  <p className="dashboard-app-desc">{app.desc}</p>
                </div>
                <ExternalLink size={14} color="var(--muted)" style={{ marginLeft: "auto", flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>

        {/* Privacy shortcut */}
        <div className="mt-6">
          <button
            type="button"
            className="dashboard-privacy-row"
            onClick={() => navigate("/privacy")}
          >
            <Shield size={16} color="var(--green)" />
            <span>Privacy &amp; Trust settings</span>
            <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>→</span>
          </button>
        </div>

        <p className="shell-footer mt-auto" style={{ marginTop: "auto", paddingTop: 32 }}>
          Built in Africa · Works on any network
        </p>
      </div>
    </Shell>
  );
}
