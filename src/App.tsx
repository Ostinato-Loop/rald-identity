// RALD Identity — App.tsx
// Routes: /, /verify, /otp, /region, /success, /login, /qr-approve, /privacy, /dashboard, /claim-username
// P4 addition: /claim-username — shown to existing users without a username (migration flow)
// ConsentBanner is rendered globally — shows on first visit across all routes.
// LILCKY STUDIO LIMITED

import { useEffect }   from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { Username }       from "@/screens/Username";
import { Verify }         from "@/screens/Verify";
import { OTP }            from "@/screens/OTP";
import { Region }         from "@/screens/Region";
import { Success }        from "@/screens/Success";
import { QrApprove }      from "@/screens/QrApprove";
import { Login }          from "@/screens/Login";
import { Privacy, ConsentBanner } from "@/screens/Privacy";
import { Dashboard }      from "@/screens/Dashboard";
import { ClaimUsername }  from "@/screens/ClaimUsername";
import { NotFound }       from "@/screens/NotFound";
import { ErrorBoundary }  from "@/components/ErrorBoundary";
import { setState, validateRedirectUrl } from "@/lib/store";

function BootParams() {
  const [params] = useSearchParams();
  useEffect(() => {
    const appId      = params.get("app_id");
    const redirectRaw = params.get("redirect_to");

    const patch: Record<string, string | null> = {};
    if (appId) patch.appId = appId;
    if (redirectRaw) {
      const safe = validateRedirectUrl(redirectRaw);
      if (safe) patch.redirectTo = safe;
      else console.warn("[RALD] Blocked unsafe redirect_to param:", redirectRaw);
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
        <Route path="/"               element={<Username />} />
        <Route path="/verify"         element={<Verify />} />
        <Route path="/otp"            element={<OTP />} />
        <Route path="/region"         element={<Region />} />
        <Route path="/success"        element={<Success />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/qr-approve"     element={<QrApprove />} />
        <Route path="/privacy"        element={<Privacy />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        {/* P4: username migration flow for existing users */}
        <Route path="/claim-username" element={<ClaimUsername />} />
        <Route path="*"               element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
