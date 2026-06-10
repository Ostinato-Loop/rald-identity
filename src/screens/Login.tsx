import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AtSign, ArrowRight, Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import { loginUsername, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

export function Login() {
  const navigate        = useNavigate();
  const [state, set]    = useStore();
  const [value, setValue]   = useState(state.username || "");
  const [loading, setLoad]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = value.trim().toLowerCase().replace(/^@/, "");
    if (!username) { setError("Enter your username to continue."); return; }

    setLoad(true);
    setError(null);
    try {
      const res = await loginUsername(username, state.appId ?? undefined);
      set({
        username,
        pendingUserId: res.pending_user_id,
        method:        res.method,
        pinId:         res.pinId ?? null,
        contact:       res.contact_hint,
        loginFlow:     true,
      });
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
        {/* Logo */}
        <div className="logo-wrap mb-8" style={{ marginTop: 16 }}>
          <RaldMark size={64} />
        </div>

        {/* Hero copy */}
        <h1 className="text-center">Welcome back</h1>
        <p className="text-center text-muted text-sm" style={{ maxWidth: 280, margin: "12px auto 0", lineHeight: 1.6 }}>
          Sign in to your{" "}
          <span style={{ color: "var(--text)", fontWeight: 700 }}>RALD Identity</span>
          {" "}and return to the ecosystem.
        </p>

        {/* Form */}
        <form style={{ marginTop: 32, display: "flex", flexDirection: "column" }} onSubmit={handleSubmit}>
          <label htmlFor="login-username" className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>
            Your username
          </label>

          <div className={`input-row${error ? " state-err" : ""}`}>
            <AtSign size={18} color="var(--muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              id="login-username"
              type="text"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              placeholder="yourname"
              value={value}
              onChange={e => {
                setValue(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase());
                setError(null);
              }}
              disabled={loading}
              maxLength={20}
            />
            {loading && (
              <Loader2 size={20} color="var(--muted)" style={{ flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
            )}
          </div>

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
