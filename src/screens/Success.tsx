import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { resolveRedirectUrl, APP_LABELS } from "@/lib/store";

const PRODUCTS = ["Loop", "Messenger", "PayRald", "RALD AI", "Mail", "Loop Business"];

export function Success() {
  const navigate       = useNavigate();
  const [state]        = useStore();
  const [secs, setSecs] = useState(4);
  const target          = resolveRedirectUrl(state);
  const appLabel        = state.appId ? (APP_LABELS[state.appId] ?? state.appId) : null;

  useEffect(() => {
    if (!state.username) { navigate("/"); return; }
  }, [state.username, navigate]);

  useEffect(() => {
    if (secs <= 0) { window.location.href = target; return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, target]);

  return (
    <Shell step={4}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        {/* Logo + check badge */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          <div
            className="animate-ping"
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: 24,
              background: "oklch(0.52 0.15 150 / 0.20)",
            }}
            aria-hidden
          />
          <div style={{ background: "var(--surface)", borderRadius: 20, padding: 12, boxShadow: "var(--shadow)" }}>
            <RaldMark size={88} />
          </div>
          <div style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--green)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 0 0 4px var(--bg)",
          }}>
            <Check size={18} color="#fff" strokeWidth={3} />
          </div>
        </div>

        <h1>
          Welcome{" "}
          <span className="text-green">@{state.username || "friend"}</span>
        </h1>
        <p className="text-muted text-sm mt-3">Your RALD Identity is ready.</p>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          You now have access to the entire RALD ecosystem.
        </p>

        {/* Ecosystem grid */}
        <div className="product-grid mt-8" style={{ width: "100%" }}>
          {PRODUCTS.map(p => (
            <div key={p} className="product-chip">{p}</div>
          ))}
        </div>

        <button
          className="btn btn-primary mt-8"
          onClick={() => { window.location.href = target; }}
        >
          {appLabel ? `Continue to ${appLabel}` : "Enter RALD"}
        </button>

        <p className="text-xs text-muted mt-3">
          Redirecting in {secs}s…
        </p>
      </div>
    </Shell>
  );
}
