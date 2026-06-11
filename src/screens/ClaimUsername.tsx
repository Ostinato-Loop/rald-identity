// RALD Identity — ClaimUsername.tsx
// P4: Existing user migration — shown after login when user has no username.
// Cannot be dismissed forever — required before advanced ecosystem access.
// LILCKY STUDIO LIMITED

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Check, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import {
  checkUsername, claimUsernameForMigration, ApiError,
} from "@/lib/auth";
import { useStore, resolveRedirectUrl } from "@/lib/store";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 400;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ClaimUsername() {
  const navigate         = useNavigate();
  const [state, set]     = useStore();
  const [username, setUsername] = useState("");
  const [status, setStatus]     = useState<Status>("idle");
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedUsername = useDebounce(username, DEBOUNCE_MS);

  useEffect(() => {
    if (!state.token) navigate("/login");
  }, [state.token, navigate]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Live availability check
  useEffect(() => {
    const u = debouncedUsername.trim().toLowerCase();
    if (!u || u.length < 2) { setStatus("idle"); return; }
    if (!/^[a-z0-9_]+$/.test(u) || u.startsWith("_") || u.endsWith("_")) {
      setStatus("invalid"); return;
    }
    setStatus("checking");
    let cancelled = false;
    checkUsername(u).then(res => {
      if (cancelled) return;
      setStatus(res.available ? "available" : "taken");
    }).catch(() => {
      if (!cancelled) setStatus("idle");
    });
    return () => { cancelled = true; };
  }, [debouncedUsername]);

  const handleChange = (val: string) => {
    const clean = val.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20);
    setUsername(clean);
    setClaimErr(null);
    if (clean.length < 2) setStatus("idle");
  };

  const isErr     = status === "taken" || status === "invalid" || !!claimErr;
  const canClaim  = status === "available" && !claimErr && !claiming;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canClaim || !state.token) return;
    setClaiming(true);
    setClaimErr(null);
    try {
      const res = await claimUsernameForMigration(state.token, username.trim().toLowerCase());
      set({
        username:      res.username,
        needsUsername: false,
        migrationMode: false,
      });
      toast.success(`@${res.username} is yours`, {
        description: `${res.reserved_email_address} is reserved for you.`,
      });
      navigate("/success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to claim username. Try again.";
      setClaimErr(msg);
      setClaiming(false);
    }
  };

  return (
    <Shell>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="logo-wrap mb-6" style={{ marginTop: 16 }}>
          <RaldMark size={56} />
        </div>

        <h1 className="text-center">Claim your username</h1>
        <p className="text-center text-muted text-sm" style={{ maxWidth: 300, margin: "12px auto 0", lineHeight: 1.6 }}>
          Your username unlocks Loop, Messenger, PayRald, and every RALD product.
          This is a <strong style={{ color: "var(--text)" }}>one-time step</strong>.
        </p>

        {/* Migration notice — cannot dismiss */}
        <div style={{
          margin: "20px 0 0",
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(62,222,114,0.07)",
          border: "1px solid rgba(62,222,114,0.2)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}>
          <CheckCircle2 size={16} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
            Complete this once to unlock full ecosystem access. You won't be asked again.
          </p>
        </div>

        <form style={{ marginTop: 28, display: "flex", flexDirection: "column" }} onSubmit={handleClaim}>
          <label htmlFor="claim-username" className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>
            Choose your username
          </label>

          <div className={`input-row${status === "available" && !claimErr ? " state-ok" : isErr ? " state-err" : ""}`}>
            <AtSign size={18} color="var(--muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              id="claim-username"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              placeholder="yourname"
              value={username}
              onChange={e => handleChange(e.target.value)}
              maxLength={20}
              onKeyDown={e => { if (e.key === "Enter") handleClaim(e as unknown as React.FormEvent); }}
            />
            {(claiming || status === "checking") && (
              <Loader2 size={20} color="var(--muted)" style={{ flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
            )}
            {!claiming && status === "available" && !claimErr && (
              <div className="status-icon ok"><Check size={14} strokeWidth={3} /></div>
            )}
            {!claiming && isErr && (
              <div className="status-icon err"><X size={14} strokeWidth={3} /></div>
            )}
          </div>

          {isErr && (
            <p className="field-error">
              {claimErr ?? (status === "taken" ? `@${username} is already taken` : "2–20 letters, numbers, or underscores")}
            </p>
          )}
          {!isErr && status === "checking" && (
            <p className="field-hint">Checking availability…</p>
          )}
          {!isErr && status === "idle" && (
            <p className="field-hint">2–20 characters. Letters, numbers, underscores.</p>
          )}

          {status === "available" && !claimErr && (
            <div className="reserve-confirm">
              <div className="reserve-item">
                <CheckCircle2 size={14} color="var(--green)" strokeWidth={2.5} />
                <span>{username}@rald.me will be yours</span>
              </div>
              <div className="reserve-item">
                <CheckCircle2 size={14} color="var(--green)" strokeWidth={2.5} />
                <span>{username}.rald.me will be yours</span>
              </div>
            </div>
          )}

          <div className="mt-8">
            <button type="submit" className="btn btn-primary" disabled={!canClaim}>
              {claiming && <span className="spinner" />}
              {claiming ? "Claiming…" : "Claim username"}
            </button>
            <p className="text-xs text-center text-muted mt-3">
              This is required to access the full RALD ecosystem.
            </p>
          </div>
        </form>
      </div>
    </Shell>
  );
}
