// RALD Identity — Smart Login Screen (Phase 6)
// Single input field: auto-detects username / email / phone number.
// Routes to OTP screen via /auth/smart-login (new unified endpoint).
// Falls back to /auth/login-username for pure @username flow.
//
// RALD AUTH EMERGENCY STABILIZATION SPRINT — Phase 6
// LILCKY STUDIO LIMITED

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AtSign, Phone, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import { smartLogin, loginUsername, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

// ── Detection helpers (mirrors backend logic) ──────────────────────────────────

type IdentifierType = "username" | "email" | "phone";

function detectType(raw: string): IdentifierType {
  const t = raw.trim();
  const digits = t.replace(/[\s\-\(\)\+]/g, "");
  if (/^\+?[\d\s\-\(\)]+$/.test(t) && digits.length >= 7 && digits.length <= 15) return "phone";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "email";
  return "username";
}

function getPlaceholder(type: IdentifierType): string {
  if (type === "email")  return "you@example.com";
  if (type === "phone")  return "+234 800 000 0000";
  return "yourname";
}

function getIcon(type: IdentifierType) {
  if (type === "email") return <Mail size={18} color="var(--muted)" style={{ flexShrink: 0 }} />;
  if (type === "phone") return <Phone size={18} color="var(--muted)" style={{ flexShrink: 0 }} />;
  return <AtSign size={18} color="var(--muted)" style={{ flexShrink: 0 }} />;
}

function getLabel(type: IdentifierType): string {
  if (type === "email") return "Email address";
  if (type === "phone") return "Phone number";
  return "Your username";
}

function getHint(type: IdentifierType): string {
  if (type === "email") return "We'll send a code to this email.";
  if (type === "phone") return "We'll send a code via SMS.";
  return "Enter your @username, email, or phone number.";
}

// ── Login Screen ──────────────────────────────────────────────────────────────

export function Login() {
  const navigate       = useNavigate();
  const [state, set]   = useStore();
  const [value, setValue]  = useState(state.username || "");
  const [idType, setType]  = useState<IdentifierType>("username");
  const [loading, setLoad] = useState(false);
  const [error, setError]  = useState<string | null>(null);
  const inputRef           = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Live-detect type as user types
  useEffect(() => {
    if (value.trim()) setType(detectType(value));
    else setType("username");
  }, [value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) { setError("Enter your username, email, or phone to continue."); return; }

    setLoad(true);
    setError(null);

    try {
      if (idType === "username") {
        // Pure username path — use existing endpoint for backward compat
        const username = raw.toLowerCase().replace(/^@/, "");
        const res = await loginUsername(username, state.appId ?? undefined);
        set({
          username,
          pendingUserId:  res.pending_user_id,
          method:         res.method,
          pinId:          res.pinId ?? null,
          contact:        res.contact_hint,
          loginFlow:      true,
          smartLoginFlow: false,
          identifier:     null,
        });
      } else {
        // Email or phone — use smart-login endpoint; OTP screen uses /auth/smart-login/complete
        const res = await smartLogin(raw, state.appId ?? undefined);
        set({
          username:       "",
          pendingUserId:  res.pending_user_id,
          method:         res.method,
          pinId:          res.pinId ?? null,
          contact:        res.contact_hint,
          loginFlow:      true,
          smartLoginFlow: true,
          identifier:     raw,
        });
      }
      navigate("/otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoad(false);
    }
  };

  const hasValue = value.trim().length > 0;

  return (
    <Shell>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="logo-wrap mb-8" style={{ marginTop: 16 }}>
          <RaldMark size={64} />
        </div>

        <h1 className="text-center">Welcome back</h1>
        <p className="text-center text-muted text-sm" style={{ maxWidth: 300, margin: "12px auto 0", lineHeight: 1.6 }}>
          Sign in with your{" "}
          <span style={{ color: "var(--text)", fontWeight: 700 }}>
            @username, email, or phone
          </span>
          .
        </p>

        <form style={{ marginTop: 32, display: "flex", flexDirection: "column" }} onSubmit={handleSubmit}>
          <label htmlFor="login-identifier" className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>
            {getLabel(idType)}
          </label>

          <div className={`input-row${error ? " state-err" : ""}`}>
            {getIcon(idType)}
            <input
              ref={inputRef}
              id="login-identifier"
              type={idType === "email" ? "email" : idType === "phone" ? "tel" : "text"}
              autoComplete={idType === "email" ? "email" : idType === "phone" ? "tel" : "username"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode={idType === "phone" ? "tel" : idType === "email" ? "email" : "text"}
              placeholder={getPlaceholder(idType)}
              value={value}
              onChange={e => {
                const v = e.target.value;
                if (!v.includes("@") && !v.match(/^\+?[\d\s\-\(\)]+$/)) {
                  setValue(v.replace(/[^a-z0-9_@\.\+\-\s\(\)]/gi, "").toLowerCase());
                } else {
                  setValue(v);
                }
                setError(null);
              }}
              disabled={loading}
              maxLength={80}
            />
            {loading && (
              <Loader2 size={20} color="var(--muted)" style={{ flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
            )}
          </div>

          {/* Live type hint */}
          {hasValue && !error && (
            <p className="text-xs text-muted" style={{ marginTop: 6 }}>
              {getHint(idType)}
            </p>
          )}

          {error && <p className="field-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary mt-6"
            disabled={!hasValue || loading}
          >
            {loading ? (
              <><span className="spinner" /> Sending code…</>
            ) : (
              <>Sign in <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span className="text-xs text-muted">or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* QR login link */}
        <p className="text-xs text-center text-muted" style={{ marginTop: 16 }}>
          On your phone?{" "}
          <Link to="/qr-approve" style={{ color: "var(--green)", fontWeight: 600 }}>
            Use QR code login
          </Link>
        </p>

        <p className="text-xs text-center text-muted mt-auto" style={{ paddingTop: 32 }}>
          New to RALD?{" "}
          <Link to="/" style={{ color: "var(--green)", fontWeight: 700 }}>
            Create an identity
          </Link>
        </p>
      </div>
    </Shell>
  );
}
