import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import {
  completeRegistration, loginComplete, smartLoginComplete,
  loginUsername, smartLogin,
  sendSMSOTP, sendEmailOTP, ApiError,
  type CompleteRegistrationResult,
  type LoginCompleteResult,
} from "@/lib/auth";
import { useStore } from "@/lib/store";

const LEN             = 6;
const VERIFY_TIMEOUT  = 30_000;

export function OTP() {
  const navigate            = useNavigate();
  const [state, set]        = useStore();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [secs, setSecs]     = useState(45);
  const [verifying, setV]   = useState(false);
  const [resending, setR]   = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!state.method || !state.pendingUserId) {
      navigate(state.loginFlow ? "/login" : "/verify");
    }
  }, [state.method, state.pendingUserId, state.loginFlow, navigate]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  // Clipboard auto-paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData("text") ?? "";
      const nums   = pasted.replace(/\D/g, "").slice(0, LEN);
      if (nums.length >= LEN) {
        e.preventDefault();
        const arr = nums.split("").concat(Array(LEN).fill("")).slice(0, LEN);
        setDigits(arr);
        refs.current[LEN - 1]?.focus();
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  // Hard timeout: if verifying stays stuck for >30s, reset and show error
  useEffect(() => {
    if (!verifying) return;
    const t = setTimeout(() => {
      setV(false);
      setDigits(Array(LEN).fill(""));
      setErr("Verification timed out. Check your connection and try again.");
      refs.current[0]?.focus();
    }, VERIFY_TIMEOUT);
    return () => clearTimeout(t);
  }, [verifying]);

  const code     = digits.join("");
  const complete = code.length === LEN;

  // biome-ignore lint/correctness/useExhaustiveDependencies: verification effect is intentionally gated by complete+verifying guards only
  useEffect(() => {
    if (!complete || verifying) return;
    setV(true);
    setErr(null);

    const run = async () => {
      try {
        if (!state.pendingUserId) throw new Error("Session lost. Please start over.");
        let result: CompleteRegistrationResult | LoginCompleteResult;

        if (state.loginFlow) {
          const payload = {
            user_id: state.pendingUserId,
            method:  (state.method ?? "email") as "sms" | "email",
            pinId:   state.pinId ?? undefined,
            pin:     state.method === "sms" ? code : undefined,
            code:    state.method === "email" ? code : undefined,
          };
          // Phase 6: smart-login (email/phone) uses a different completion endpoint
          result = state.smartLoginFlow
            ? await smartLoginComplete(payload)
            : await loginComplete(payload);

          const loginResult = result as LoginCompleteResult;

          // FIX: persist username from server response so Success.tsx guard
          // doesn't bounce email/phone-login users back to registration.
          // state.username may be "" when user logged in via email or phone.
          const resolvedUsername =
            loginResult.user?.username ?? state.username ?? "";

          // FIX: track needs_username so migration users get routed to /claim-username
          // instead of landing on /success with no username and broken ecosystem access.
          const needsUsername = loginResult.needs_username ?? false;

          set({
            token:        loginResult.token,
            username:     resolvedUsername,
            needsUsername,
            migrationMode: needsUsername,
          });

          // Route: migration users without a username → claim-username; everyone else → success
          if (needsUsername && !resolvedUsername) {
            navigate("/claim-username");
          } else {
            navigate("/success");
          }
          return;
        }

        // Registration OTP path
        const payload = state.method === "sms"
          ? { pending_user_id: state.pendingUserId, method: "sms" as const, pinId: state.pinId ?? undefined, pin: code, phone: state.contact }
          : { pending_user_id: state.pendingUserId, method: "email" as const, email: state.contact, code, sessionToken: state.emailSessionToken ?? undefined };
        result = await completeRegistration(payload);
        set({ token: result.token });
        navigate("/region");

      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Incorrect code. Try again.";
        setV(false);
        setDigits(Array(LEN).fill(""));
        refs.current[0]?.focus();
        // Sanitize: never show raw 5xx server text to the user
        const friendly =
          e instanceof ApiError && e.status >= 500
            ? "Verification failed — server issue. Go back and try a different method."
            : msg;
        setErr(friendly);
      }
    };
    run();
  }, [complete, verifying]);

  const setAt = (i: number, v: string) =>
    setDigits(prev => { const n = [...prev]; n[i] = v; return n; });

  const onChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "");
    if (!v) { setAt(i, ""); return; }
    if (v.length > 1) {
      const chars = v.slice(0, LEN - i).split("");
      setDigits(prev => {
        const n = [...prev];
        for (let k = 0; k < chars.length; k++) { n[i + k] = chars[k]; }
        return n;
      });
      refs.current[Math.min(i + chars.length, LEN - 1)]?.focus();
      return;
    }
    setAt(i, v);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      setAt(i - 1, "");
    }
  };

  const handleResend = async () => {
    if (resending || secs > 0) return;
    setR(true);
    setErr(null);
    try {
      if (state.loginFlow) {
        if (state.smartLoginFlow && state.identifier) {
          // Phase 6: resend via smart-login (email or phone)
          const res = await smartLogin(state.identifier, state.appId ?? undefined);
          set({ pinId: res.pinId ?? null });
        } else {
          // Classic username login resend
          const res = await loginUsername(state.username ?? "", state.appId ?? undefined);
          set({ pinId: res.pinId ?? null });
        }
      } else if (state.method === "sms") {
        const res = await sendSMSOTP(state.contact);
        set({ pinId: res.pinId });
      } else {
        await sendEmailOTP(state.contact);
      }
      toast.success("New code sent", {
        description: state.method === "sms" ? "Check your SMS." : "Check your inbox.",
      });
      setSecs(45);
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
    } catch (e) {
      const isSmsDown =
        e instanceof ApiError &&
        (e.status === 503 || e.message.toLowerCase().includes("sms") || e.message.toLowerCase().includes("unavailable"));
      if (isSmsDown && state.method === "sms") {
        toast.error("SMS unavailable", {
          description: "Go back and switch to email verification.",
          action: {
            label: "Switch to email",
            onClick: () => navigate(state.loginFlow ? "/login" : "/verify"),
          },
        });
      } else {
        toast.error("Couldn't resend", { description: e instanceof ApiError ? e.message : "Try again." });
      }
    } finally {
      setR(false);
    }
  };

  const masked = state.method === "email"
    ? state.contact.replace(/(.{2}).+(@.+)/, "$1•••$2")
    : state.contact.replace(/(\+?\d{3})\d+(\d{2})/, "$1•••$2");

  const boxClass = (d: string) =>
    `otp-box${err ? " otp-error" : d ? " filled" : ""}`;

  return (
    <Shell step={3}>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <button
          type="button"
          className="btn btn-ghost mb-4"
          style={{ alignSelf: "flex-start" }}
          onClick={() => navigate(state.loginFlow ? "/login" : "/verify")}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1>Enter the code</h1>
        <p className="text-muted text-sm mt-3" style={{ lineHeight: 1.6 }}>
          Sent to your {state.method === "email" ? "email" : "phone"}{" "}
          <strong style={{ color: "var(--text)" }}>{masked}</strong>
        </p>

        <div className="otp-row mt-8">
          {digits.map((d, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: OTP slots are fixed-position
            <input key={i}
              ref={el => { refs.current[i] = el; }}
              className={boxClass(d)}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={d}
              disabled={verifying}
              onChange={e => onChange(i, e.target.value)}
              onKeyDown={e => onKeyDown(i, e)}
              onFocus={e => e.target.select()}
            />
          ))}
        </div>

        {verifying && (
          <div className="text-center text-muted text-sm mt-6" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />
            Verifying…
          </div>
        )}

        {err && !verifying && <p className="field-error text-center mt-4">{err}</p>}

        <p className="text-xs text-center text-muted mt-4" style={{ lineHeight: 1.5 }}>
          Code arrives within 60 seconds.{" "}
          {state.method === "sms" ? "Check SMS & notifications." : "Check spam if needed."}
        </p>

        <div className="mt-auto text-center" style={{ paddingTop: 32 }}>
          {secs > 0 ? (
            <p className="text-xs text-muted">
              Resend in{" "}
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--text)" }}>
                {secs}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ margin: "0 auto", width: "auto" }}
              disabled={resending}
              onClick={handleResend}
            >
              {resending && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
