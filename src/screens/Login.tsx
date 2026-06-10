import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { loginUsername, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

export function Login() {
  const navigate        = useNavigate();
  const [state, set]    = useStore();
  const [value, setValue]   = useState(state.username || "");
  const [loading, setLoad]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

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

  return (
    <Shell step={1}>
      <h1>Welcome back</h1>
      <p className="text-muted text-sm mt-3">
        Enter your <span className="text-green">@username</span> to sign in.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
        <div className="field-group">
          <div className="input-prefix">@</div>
          <input
            className="input"
            type="text"
            placeholder="username"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={e => {
              setValue(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase());
              setError(null);
            }}
            disabled={loading}
          />
        </div>

        {error && <p className="field-error mt-2">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary mt-6"
          disabled={!value.trim() || loading}
        >
          {loading ? "Sending code…" : "Sign in"}
        </button>
      </form>

      <p className="text-xs text-muted mt-auto" style={{ paddingTop: 32, textAlign: "center" }}>
        New to RALD?{" "}
        <Link to="/" style={{ color: "var(--green)", fontWeight: 600 }}>
          Create an identity
        </Link>
      </p>
    </Shell>
  );
}
