import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { completeRegistration, loginComplete, loginUsername, sendSMSOTP, sendEmailOTP, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

const LEN = 6;

export function OTP() {
  const navigate          = useNavigate();
  const [state, set]      = useStore();
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

  const code     = digits.join("");
  const complete = code.length === LEN;

  useEffect(() => {
    if (!complete || verifying) return;
    setV(true);
    setErr(null);

    const run = async () => {
      try {
        if (!state.pendingUserId) throw new Error("Session lost. Please start over.");
        let result;
        if (state.loginFlow) {
          result = await loginComplete({
            user_id: state.pendingUserId,
            method:  state.method!,
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
        navigate("/success");
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Incorrect code. Try again.";
        setV(false);
        setDigits(Array(LEN).fill(""));
        refs.current[0]?.focus();
        setErr(msg);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: other state deps intentionally excluded; run is gated by complete+verifying
  }, [complete, verifying, state.loginFlow]);

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
        const res = await loginUsername(state.username!, state.appId ?? undefined);
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
      <button type="button" className="btn btn-ghost mb-4" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/verify")}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1>Enter your code</h1>
      <p className="text-muted text-sm mt-3">
        Sent to your {state.method === "email" ? "email" : "phone"}{" "}
        <strong style={{ color: "var(--text)" }}>{masked}</strong>
      </p>

      <div className="otp-row mt-8">
        {digits.map((d, i) => (
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
        ))}
      </div>

      {verifying && (
        <div className="text-center text-muted text-sm mt-6" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />
          Verifying…
        </div>
      )}

      {err && !verifying && <p className="field-error text-center mt-4">{err}</p>}

      <div className="mt-auto text-center" style={{ paddingTop: 32 }}>
        {secs > 0 ? (
          <p className="text-xs text-muted">
            Resend code in <span style={{ fontVariantNumeric: "tabular-nums" }}>{secs}s</span>
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
    </Shell>
  );
}
