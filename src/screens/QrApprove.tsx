// RALD Identity — QR Approve Screen
// Mobile user scans QR code on desktop → opened at /qr-approve?token=<token>
// If not authenticated → prompt login first, return here after
// If authenticated  → show approve / reject UI
// LILCKY STUDIO LIMITED

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { RaldMark as Logo } from "@/components/Logo";
import { qrScan, qrApprove, qrReject, getSession, ApiError } from "@/lib/auth";
import { Monitor, Check, X, AlertTriangle, Loader2 } from "lucide-react";

type Phase = "loading" | "unauthenticated" | "confirm" | "approving" | "done" | "error";

interface QrScanInfo {
  ok: boolean;
  desktop_ip: string;
}

export function QrApprove() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get("token") ?? "";

  const [phase, setPhase]     = useState<Phase>("loading");
  const [errMsg, setErrMsg]   = useState("");
  const [scanInfo, setScanInfo] = useState<QrScanInfo | null>(null);
  const [username, setUsername] = useState("");
  const [result, setResult]   = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    if (!token) { setPhase("error"); setErrMsg("Invalid QR link — no token found."); return; }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const bootstrap = async () => {
    setPhase("loading");
    try {
      // Check if already authenticated
      const session = await getSession();
      if (!session?.user) {
        setPhase("unauthenticated");
        return;
      }
      setUsername(session.user.username ?? session.user.email ?? "");

      // Mark QR as scanned (calls POST /auth/qr/scan/:token)
      const info = await qrScan(token);
      setScanInfo(info);
      setPhase("confirm");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPhase("unauthenticated");
      } else {
        setPhase("error");
        setErrMsg((err as Error).message ?? "Could not load QR session.");
      }
    }
  };

  const handleApprove = async () => {
    setPhase("approving");
    try {
      await qrApprove(token);
      setResult("approved");
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setErrMsg((err as ApiError).message ?? "Approval failed.");
    }
  };

  const handleReject = async () => {
    setPhase("approving");
    try {
      await qrReject(token);
      setResult("rejected");
      setPhase("done");
    } catch {
      setResult("rejected");
      setPhase("done");
    }
  };

  return (
    <Shell>
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      "100dvh",
          padding:        "24px 20px",
          gap:            "24px",
          textAlign:      "center",
        }}
      >
        <Logo size={56} />

        {phase === "loading" && (
          <LoadingState />
        )}

        {phase === "unauthenticated" && (
          <UnauthState
            onLogin={() => {
              // Navigate to login with return URL
              navigate(
                `/?redirect_to=${encodeURIComponent(`/qr-approve?token=${token}`)}`,
              );
            }}
          />
        )}

        {phase === "confirm" && (
          <ConfirmState
            username={username}
            desktopIp={scanInfo?.desktop_ip ?? ""}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {phase === "approving" && (
          <ApprovingState />
        )}

        {phase === "done" && (
          {/* biome-ignore lint/style/noNonNullAssertion: result is guaranteed non-null when phase==="done" */}
          <DoneState result={result!} />
        )}

        {phase === "error" && (
          <ErrorState message={errMsg} onRetry={bootstrap} />
        )}
      </div>
    </Shell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <>
      <Loader2
        style={{ width: 36, height: 36, color: "var(--green)", animation: "spin 1s linear infinite" }}
      />
      <p style={{ fontSize: 15, color: "var(--muted-fg)" }}>Loading QR session…</p>
    </>
  );
}

function UnauthState({ onLogin }: { onLogin: () => void }) {
  return (
    <>
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "24px 28px", maxWidth: 360, width: "100%" }}>
        <Monitor style={{ width: 40, height: 40, color: "var(--green)", margin: "0 auto 12px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>
          Log in to approve
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-fg)", lineHeight: 1.5 }}>
          Sign in to your RALD account on this device to approve the login request on your computer.
        </p>
      </div>
      <button
        type="button"
        onClick={onLogin}
        style={{
          background: "var(--green)", color: "white", border: "none",
          borderRadius: 14, padding: "14px 32px",
          fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", maxWidth: 360,
        }}
      >
        Sign in first
      </button>
    </>
  );
}

function ConfirmState({
  username,
  desktopIp,
  onApprove,
  onReject,
}: {
  username: string;
  desktopIp: string;
  onApprove: () => void;
  onReject:  () => void;
}) {
  return (
    <>
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "24px 28px", maxWidth: 360, width: "100%" }}>
        <Monitor style={{ width: 40, height: 40, color: "var(--green)", margin: "0 auto 12px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", marginBottom: 6 }}>
          Approve this login?
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-fg)", lineHeight: 1.5, marginBottom: 16 }}>
          A computer is requesting to sign in as{" "}
          <strong style={{ color: "var(--fg)" }}>@{username}</strong>.
        </p>
        {desktopIp && (
          <div style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "var(--muted-fg)", textAlign: "left" }}>
            <strong>Device IP:</strong> {desktopIp}
            <br />
            <strong>If this wasn't you</strong>, tap Reject.
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 360 }}>
        <button
          type="button"
          onClick={onReject}
          style={{
            flex: 1, background: "transparent", border: "1.5px solid var(--border)",
            borderRadius: 14, padding: "14px 0",
            fontSize: 15, fontWeight: 700, cursor: "pointer", color: "var(--fg)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <X style={{ width: 18, height: 18 }} />
          Reject
        </button>
        <button
          type="button"
          onClick={onApprove}
          style={{
            flex: 2, background: "var(--green)", color: "white", border: "none",
            borderRadius: 14, padding: "14px 0",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <Check style={{ width: 18, height: 18 }} />
          Approve
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-fg)" }}>
        Approving will sign that computer in for 30 days.
      </p>
    </>
  );
}

function ApprovingState() {
  return (
    <>
      <Loader2 style={{ width: 36, height: 36, color: "var(--green)", animation: "spin 1s linear infinite" }} />
      <p style={{ fontSize: 15, color: "var(--muted-fg)" }}>Processing…</p>
    </>
  );
}

function DoneState({ result }: { result: "approved" | "rejected" }) {
  return (
    <>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: result === "approved" ? "var(--green)" : "var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {result === "approved"
          ? <Check style={{ width: 36, height: 36, color: "white", strokeWidth: 3 }} />
          : <X    style={{ width: 36, height: 36, color: "var(--fg)" }} />
        }
      </div>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>
          {result === "approved" ? "Login approved!" : "Login rejected"}
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-fg)", maxWidth: 280 }}>
          {result === "approved"
            ? "The computer is now signed in. You can close this tab."
            : "The login request was denied. You can close this tab."
          }
        </p>
      </div>
    </>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <AlertTriangle style={{ width: 40, height: 40, color: "#e35b4a" }} />
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fg)", marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted-fg)", marginBottom: 16 }}>{message}</p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: "var(--green)", color: "white", border: "none",
            borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </>
  );
}
