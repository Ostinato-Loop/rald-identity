import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AtSign, Check, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { RaldMark } from "@/components/Logo";
import { checkUsername, registerUsername, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

const VALID     = /^[a-z0-9_]{2,20}$/;
const NO_EDGE   = /^_|_$/;
const NO_DOUBLE = /_{2,}/;

const EXAMPLES = ["@boyd", "@lagosmusic", "@abujacreator", "@manillafm"];

export function Username() {
  const navigate                = useNavigate();
  const [state, set]            = useStore();
  const [username, setUsername] = useState(state.username || "");
  const [status, setStatus]     = useState<Status>("idle");
  const [registering, setReg]   = useState(false);
  const [regErr, setRegErr]     = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const abortRef                = useRef<AbortController | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!username) { setStatus("idle"); return; }
    if (!VALID.test(username) || NO_EDGE.test(username) || NO_DOUBLE.test(username)) {
      setStatus("invalid"); return;
    }
    setStatus("checking");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      try {
        const r = await checkUsername(username);
        if (!ctrl.signal.aborted) setStatus(r.available ? "available" : "taken");
      } catch {
        if (!ctrl.signal.aborted) setStatus("idle");
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [username]);

  const canContinue = status === "available" && !registering;

  const handleChange = (raw: string) => {
    setUsername(raw.replace(/[^a-z0-9_]/gi, "").toLowerCase());
    setRegErr(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    setReg(true);
    setRegErr(null);
    try {
      const result = await registerUsername(username, state.appId ?? undefined);
      set({ username, pendingUserId: result.pending_user_id, loginFlow: false });
      navigate("/verify");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't reserve username. Try again.";
      setRegErr(msg);
      toast.error("Username unavailable", { description: msg });
    } finally {
      setReg(false);
    }
  };

  const isErr = !!(regErr || status === "taken" || status === "invalid");

  return (
    <Shell step={1}>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Logo */}
        <div className="logo-wrap mb-8">
          <div className="animate-float">
            <RaldMark size={72} />
          </div>
        </div>

        {/* Hero copy */}
        <h1 className="text-center">
          One Identity.<br />
          <span className="text-green">Every RALD Product.</span>
        </h1>
        <p className="text-center text-muted text-sm" style={{ maxWidth: 300, margin: "12px auto 0", lineHeight: 1.6 }}>
          Your username unlocks Loop, Messenger, PayRald, RALD Mail, and everything we build next.
        </p>

        {/* Form */}
        <form style={{ marginTop: 32, display: "flex", flexDirection: "column" }} onSubmit={handleSubmit}>
          <label htmlFor="username" className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>
            Choose your username
          </label>

          <div className={`input-row${status === "available" && !regErr ? " state-ok" : isErr ? " state-err" : ""}`}>
            <AtSign size={18} color="var(--muted)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              id="username"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              placeholder="yourname"
              value={username}
              onChange={e => handleChange(e.target.value)}
              maxLength={20}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit(e as unknown as React.FormEvent); }}
            />
            {(registering || status === "checking") && (
              <Loader2 size={20} color="var(--muted)" style={{ flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
            )}
            {!registering && status === "available" && (
              <div className="status-icon ok"><Check size={14} strokeWidth={3} /></div>
            )}
            {!registering && isErr && (
              <div className="status-icon err"><X size={14} strokeWidth={3} /></div>
            )}
          </div>

          {/* Status / hint */}
          {isErr && (
            <p className="field-error">
              {regErr ?? (status === "taken" ? `@${username} is already taken` : "2–20 letters, numbers, or underscores")}
            </p>
          )}
          {!isErr && status === "checking" && (
            <p className="field-hint">Checking availability…</p>
          )}
          {!isErr && status === "idle" && (
            <p className="field-hint">2–20 characters. Letters, numbers, underscores.</p>
          )}

          {/* Reservation confirmation */}
          {status === "available" && !regErr && (
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

          {/* Example suggestions */}
          <div className="mt-5">
            <p className="text-xs text-muted" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Try
            </p>
            <div className="pill-row">
              {EXAMPLES.map(ex => (
                <button key={ex} type="button" className="pill" onClick={() => handleChange(ex.slice(1))}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <button type="submit" className="btn btn-primary" disabled={!canContinue}>
              {registering && <span className="spinner" />}
              {registering ? "Reserving…" : "Continue"}
            </button>
            <p className="text-xs text-center text-muted mt-3">
              Email and phone can be added later.
            </p>
          </div>
        </form>

        <p className="text-xs text-center text-muted mt-auto" style={{ paddingTop: 32 }}>
          Already have an identity?{" "}
          <Link to="/login" className="text-green" style={{ fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </Shell>
  );
}
