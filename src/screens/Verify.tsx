import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { sendSMSOTP, sendEmailOTP, ApiError } from "@/lib/auth";
import { useStore } from "@/lib/store";

export function Verify() {
  const navigate        = useNavigate();
  const [state, set]    = useStore();
  const [method, setMethod] = useState<"sms" | "email" | null>(
    state.method === "sms" || state.method === "email" ? state.method : null,
  );
  const [contact, setContact] = useState(state.contact || "");
  const [sending, setSending] = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => {
    if (!state.username || !state.pendingUserId) navigate("/");
  }, [state.username, state.pendingUserId, navigate]);

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
      const msg = e instanceof ApiError ? e.message : "Failed to send code. Try again.";
      setErr(msg);
      toast.error("Couldn't send code", { description: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell step={2}>
      <button type="button" className="btn btn-ghost mb-4" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/")}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1>Verify your identity</h1>
      <p className="text-muted text-sm mt-3">
        Choose one method to continue.{" "}
        <strong style={{ color: "var(--text)" }}>@{state.username}</strong>
      </p>

      <div className="method-cards mt-6">
        <button
          type="button"
          className={`method-card${method === "sms" ? " active-green" : ""}`}
          onClick={() => { setMethod("sms"); setContact(""); setErr(null); }}
        >
          <span className="method-icon"><MessageSquare size={20} /></span>
          <span>
            <div className="method-title">SMS Verification</div>
            <div className="method-desc">Get a 6-digit code on your phone</div>
          </span>
        </button>

        <button
          type="button"
          className={`method-card${method === "email" ? " active-gold" : ""}`}
          onClick={() => { setMethod("email"); setContact(""); setErr(null); }}
        >
          <span className="method-icon"><Mail size={20} /></span>
          <span>
            <div className="method-title">Email Verification</div>
            <div className="method-desc">Get a 6-digit code in your inbox</div>
          </span>
        </button>
      </div>

      {method && (
        <div className="mt-5">
          <label htmlFor="contact-input" className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
            {method === "sms" ? "Phone number" : "Email address"}
          </label>
          <input
            id="contact-input"
            className="input-plain"
            type={method === "sms" ? "tel" : "email"}
            inputMode={method === "sms" ? "tel" : "email"}
            placeholder={method === "sms" ? "+234 800 000 0000" : "you@example.com"}
            value={contact}
            onChange={e => { setContact(e.target.value); setErr(null); }}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          />
          {err && <p className="field-error">{err}</p>}
        </div>
      )}

      <div className="mt-auto" style={{ paddingTop: 32 }}>
        <button type="button" className="btn btn-primary" disabled={!valid || sending} onClick={handleSend}>
          {sending ? <><span className="spinner" /> Sending…</> : <>Send Code <ArrowRight size={18} /></>}
        </button>
      </div>
    </Shell>
  );
}
