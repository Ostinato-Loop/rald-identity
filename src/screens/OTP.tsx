import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import {
  completeRegistration, loginComplete, loginUsername,
  sendSMSOTP, sendEmailOTP, ApiError,
  type CompleteRegistrationResult,
} from "@/lib/auth";
import { useStore } from "@/lib/store";

const LEN = 6;

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

  const code     = digits.join("");
  const complete = code.length === LEN;

  // biome-ignore lint/correctness/useExhaustiveDependencies: verification effect is intentionally gated by complete+verifying guards only; all inner state is consumed inside the async fn without driving re-runs
  useEffect(() => {
    if (!complete || verifying) return;
    setV(true);
    setErr(null);

    const run = async () => {
      try {
        if (!state.pendingUserId) throw new Error("Session lost. Please start over.");
        let result: CompleteRegistrationResult;
        if (state.loginFlow) {
          result = await loginComplete({
            user_id: state.pendingUserId,
            method:  (state.method ?? "email") as "sms" | "email",
            pinId:   state.pinId ?? undefined,
            pin:     state.method === "sms" ? code : undefined,
            code:    state.method === "email" ? code : undefined,
          });
        } else {
          const payload = state.method === "sms"
            ? { pending_user_id: state.pendingUserId, method: "sms" as const, pinId: state.pinId ?? undefined, pin: code, phone: state.contact }
            : { pending_user_id: state.pendingUserId, method: "email" as const, email: state.contact, code };
          result = await completeRegistration(payload);
        }
        set({ token: result.token });
        navigate(state.loginFlow ? "/success" : "/region");
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Incorrect code. Try again.";
        setV(false);
        setDigits(Array(LEN).fill(""));
        refs.current[0]?.focus();
        setErr(msg);
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
        chars.forEach((c, k) => { n[i + k] = c; });
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
        const res = await loginUsername(state.username ?? "", state.appId ?? undefined);
        set({ pinId: res.pinId ?? null });
        toast.success("New code sent");
      } else if (state.method === "sms") {
        const res = await sendSMSOTP(state.contact);
        set({ pinId: res.pinId });
        toast.success("New code sent", { description: "Check your SMS." });
      } else {
        await sendEmailOTP(state.contact);
        toast.success("New code sent", { description: "Check your inbox." });
      }
      setSecs(45);
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
    } catch (e) {
      toast.error("Couldn't resend", { description: e instanceof ApiError ? e.message : "Try again." });
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
          {digits.map((d, i) => {
            // biome-ignore lint/suspicious/noArrayIndexKey: OTP input slots are fixed-position and never reorder
            return (
              <input
                key={i}
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
            );
          })}
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
