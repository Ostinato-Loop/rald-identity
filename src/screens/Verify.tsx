import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, MessageSquare, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { sendSMSOTP, sendEmailOTP, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

export function Verify() {
  const navigate            = useNavigate();
  const [state, set]        = useStore();
  const [method, setMethod] = useState<"sms" | "email" | null>(
    state.method === "sms" || state.method === "email" ? state.method : null,
  );
  const [contact, setContact]         = useState(state.contact || "");
  const [sending, setSending]         = useState(false);
  const [err, setErr]                 = useState<string | null>(null);
  const [smsUnavailable, setSmsUnavail] = useState(false);
  const contactRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.username || !state.pendingUserId) navigate("/");
  }, [state.username, state.pendingUserId, navigate]);

  useEffect(() => {
    if (method) {
      setContact("");
      setErr(null);
      if (method === "email") setSmsUnavail(false);
      setTimeout(() => contactRef.current?.focus(), 80);
    }
  }, [method]);

  const valid = method === "sms"
    ? /^\+?\d[\d\s-]{6,}$/.test(contact)
    : method === "email"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
      : false;

  const handleSend = async () => {
    if (!valid || !method || sending) return;
    setSending(true);
    setErr(null);
    try {
      if (method === "sms") {
        const phone = contact.replace(/\s+/g, "");
        const res = await sendSMSOTP(phone);
        set({ method, contact: phone, pinId: res.pinId });
        toast.success("Code sent", { description: "Check your SMS for a 6-digit code." });
      } else {
        const email = contact.trim().toLowerCase();
        await sendEmailOTP(email);
        set({ method, contact: email, pinId: null });
        toast.success("Code sent", { description: `Check your inbox at ${email}.` });
      }
      navigate("/otp");
    } catch (e) {
      const isSmsDown =
        e instanceof ApiError &&
        (e.status === 503 || e.message.toLowerCase().includes("sms"));
      if (isSmsDown && method === "sms") {
        setSmsUnavail(true);
        setErr("SMS is temporarily unavailable. Switch to email to continue.");
      } else {
        const msg = e instanceof ApiError ? e.message : "Failed to send code. Try again.";
        setErr(msg);
        toast.error("Couldn't send code", { description: msg });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell step={2}>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <button type="button" className="btn btn-ghost mb-4" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/")}>
          <ArrowLeft size={16} /> Back
        </button>

        <h1>
          Verify{" "}
          <span className="text-green">@{state.username}</span>
        </h1>
        <p className="text-muted text-sm mt-3" style={{ lineHeight: 1.6 }}>
          Choose how to receive your one-time code.
          Your identity stays private.
        </p>

        <div className="method-cards mt-6">
          <button
            type="button"
            className={`method-card${method === "sms" ? " active-green" : ""}${smsUnavailable ? " method-card-disabled" : ""}`}
            onClick={() => !smsUnavailable && setMethod("sms")}
            disabled={smsUnavailable}
            title={smsUnavailable ? "SMS is temporarily unavailable" : undefined}
          >
            <span className="method-icon"><MessageSquare size={20} /></span>
            <span>
              <div className="method-title">
                SMS
                {smsUnavailable && (
                  <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "var(--red, #ef4444)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Unavailable
                  </span>
                )}
              </div>
              <div className="method-desc">
                {smsUnavailable ? "Currently unavailable" : "6-digit code to your phone"}
              </div>
            </span>
          </button>

          <button
            type="button"
            className={`method-card${method === "email" ? " active-gold" : ""}${smsUnavailable ? " method-card-recommended" : ""}`}
            onClick={() => setMethod("email")}
          >
            <span className="method-icon"><Mail size={20} /></span>
            <span>
              <div className="method-title">
                Email
                {smsUnavailable && (
                  <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "var(--gold, #f59e0b)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Recommended
                  </span>
                )}
              </div>
              <div className="method-desc">6-digit code to your inbox</div>
            </span>
          </button>
        </div>

        {/* SMS unavailable banner — shown after a failed SMS send */}
        {smsUnavailable && method === "sms" && (
          <div
            className="animate-in"
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle size={16} style={{ color: "var(--red, #ef4444)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--red, #ef4444)", margin: "0 0 4px" }}>
                SMS is temporarily unavailable
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                Switch to email to complete your verification. Your @username is still reserved.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10, padding: "8px 16px", fontSize: "0.8rem" }}
                onClick={() => setMethod("email")}
              >
                <Mail size={14} /> Switch to email
              </button>
            </div>
          </div>
        )}

        {method && (
          <div className="mt-5 animate-in">
            <label htmlFor="contact-input" className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
              {method === "sms" ? "Phone number" : "Email address"}
            </label>
            <input
              ref={contactRef}
              id="contact-input"
              className={`input-plain${err && !smsUnavailable ? " input-plain-err" : ""}`}
              type={method === "sms" ? "tel" : "email"}
              inputMode={method === "sms" ? "tel" : "email"}
              autoComplete={method === "sms" ? "tel" : "email"}
              placeholder={method === "sms" ? "+234 800 000 0000" : "you@example.com"}
              value={contact}
              onChange={e => { setContact(e.target.value); setErr(null); }}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            />
            {err && !smsUnavailable && <p className="field-error">{err}</p>}
          </div>
        )}

        <div className="mt-auto" style={{ paddingTop: 32 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || sending}
            onClick={handleSend}
          >
            {sending
              ? <><span className="spinner" /> Sending…</>
              : <>Send Code <ArrowRight size={18} /></>
            }
          </button>
        </div>
      </div>
    </Shell>
  );
}
