// RALD Identity — Dashboard
// Route: /dashboard
// Shown when a user lands on profiles.rald.cloud directly (no app_id / redirect_to)
// after a successful registration or login flow.
// LILCKY STUDIO LIMITED

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shell }       from "@/components/Shell";
import { RaldMark }    from "@/components/Logo";
import { useStore }    from "@/lib/store";
import { ExternalLink, Shield } from "lucide-react";

const APPS = [
  { id: "loop",      label: "Loop",      desc: "Social feed",       url: "https://loop.rald.cloud",      color: "var(--green)" },
  { id: "messenger", label: "Messenger", desc: "Private messages",  url: "https://messenger.rald.cloud",  color: "var(--gold)"  },
  { id: "pay",       label: "Pay",       desc: "Send money",        url: "https://pay.rald.cloud",        color: "var(--red)"   },
] as const;

export function Dashboard() {
  const navigate = useNavigate();
  const [store]  = useStore();

  // If no token in store, user isn't authenticated — send them to login
  useEffect(() => {
    if (!store.token) navigate("/login", { replace: true });
  }, [store.token, navigate]);

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
