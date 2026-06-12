// RALD Identity — App.tsx
// Routes: /, /verify, /otp, /region, /success, /login, /qr-approve, /privacy,
//         /account, /security, /claim-username
//
// UI Consolidation (2026-06-12):
//   /account     — canonical RALD Account Portal (new, replaces /dashboard forwarder)
//   /security    — Security Center: sessions, devices, revoke
//   /dashboard   — redirects to /account (backward compat)
//
// profiles.rald.cloud is now THE ONE official RALD Account Portal.
// rald-auth-ui is deprecated and redirects here.
// Products must redirect here for any identity change.
//
// RALD Identity UI Consolidation — one frontend, zero duplication.
// LILCKY STUDIO LIMITED

import { useEffect }   from "react";
import { Route, Routes, useSearchParams, Navigate } from "react-router-dom";
import { Username }          from "@/screens/Username";
import { Verify }            from "@/screens/Verify";
import { OTP }               from "@/screens/OTP";
import { Region }            from "@/screens/Region";
import { Success }           from "@/screens/Success";
import { QrApprove }         from "@/screens/QrApprove";
import { Login }             from "@/screens/Login";
import { Privacy, ConsentBanner } from "@/screens/Privacy";
import { AccountDashboard }  from "@/screens/AccountDashboard";
import { SecurityCenter }    from "@/screens/SecurityCenter";
import { ClaimUsername }     from "@/screens/ClaimUsername";
import { NotFound }          from "@/screens/NotFound";
import { ErrorBoundary }     from "@/components/ErrorBoundary";
import { setState, validateRedirectUrl } from "@/lib/store";

const USERNAME_PARAM_RE = /^[a-zA-Z0-9_]{2,20}$/;

function BootParams() {
  const [params] = useSearchParams();
  useEffect(() => {
    const appId       = params.get("app_id");
    const redirectRaw = params.get("redirect_to");
    const username    = params.get("username");

    const patch: Record<string, string | null> = {};
    if (appId) patch.appId = appId;
    if (redirectRaw) {
      const safe = validateRedirectUrl(redirectRaw);
      if (safe) patch.redirectTo = safe;
      else console.warn("[RALD] Blocked unsafe redirect_to param:", redirectRaw);
    }
    // Pre-fill username when coming from app.rald.cloud onboarding
    if (username && USERNAME_PARAM_RE.test(username)) {
      patch.username = username.toLowerCase();
    }

    if (Object.keys(patch).length > 0) setState(patch);
  }, [params]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BootParams />
      <ConsentBanner />
      <Routes>
        {/* ── Registration & onboarding ── */}
        <Route path="/"               element={<Username />} />
        <Route path="/verify"         element={<Verify />} />
        <Route path="/otp"            element={<OTP />} />
        <Route path="/region"         element={<Region />} />
        <Route path="/success"        element={<Success />} />

        {/* ── Sign in ── */}
        <Route path="/login"          element={<Login />} />
        <Route path="/qr-approve"     element={<QrApprove />} />

        {/* ── Account Portal (ONE RALD) ── */}
        <Route path="/account"        element={<AccountDashboard />} />
        <Route path="/security"       element={<SecurityCenter />} />
        <Route path="/privacy"        element={<Privacy />} />

        {/* ── Legacy /dashboard → /account (backward compat) ── */}
        <Route path="/dashboard"      element={<Navigate to="/account" replace />} />
        <Route path="/profile"        element={<Navigate to="/account" replace />} />

        {/* ── Migration ── */}
        <Route path="/claim-username" element={<ClaimUsername />} />

        {/* ── Catch-all ── */}
        <Route path="*"               element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
