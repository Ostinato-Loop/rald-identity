// RALD Identity — App.tsx
// Routes: /, /verify, /otp, /success, /login, /qr-approve, /privacy, /dashboard
// ConsentBanner is rendered globally — shows on first visit across all routes.
// LILCKY STUDIO LIMITED

import { useEffect }   from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { Username }    from "@/screens/Username";
import { Verify }      from "@/screens/Verify";
import { OTP }         from "@/screens/OTP";
import { Success }     from "@/screens/Success";
import { QrApprove }   from "@/screens/QrApprove";
import { Login }       from "@/screens/Login";
import { Privacy, ConsentBanner } from "@/screens/Privacy";
import { Dashboard }   from "@/screens/Dashboard";
import { setState }    from "@/lib/store";

function BootParams() {
  const [params] = useSearchParams();
  useEffect(() => {
    const appId      = params.get("app_id");
    const redirectTo = params.get("redirect_to");
    if (appId || redirectTo) {
      setState({
        ...(appId      ? { appId }      : {}),
        ...(redirectTo ? { redirectTo } : {}),
      });
    }
  }, [params]);
  return null;
}

export default function App() {
  return (
    <>
      <BootParams />
      {/* First-visit privacy notice — renders as a bottom sheet on all pages */}
      <ConsentBanner />
      <Routes>
        <Route path="/"           element={<Username />} />
        <Route path="/verify"     element={<Verify />} />
        <Route path="/otp"        element={<OTP />} />
        <Route path="/success"    element={<Success />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/qr-approve" element={<QrApprove />} />
        <Route path="/privacy"    element={<Privacy />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="*"           element={<Username />} />
      </Routes>
    </>
  );
}
