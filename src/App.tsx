import { useEffect } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { Username } from "@/screens/Username";
import { Verify } from "@/screens/Verify";
import { OTP } from "@/screens/OTP";
import { Success } from "@/screens/Success";
import { setState } from "@/lib/store";

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
      <Routes>
        <Route path="/"        element={<Username />} />
        <Route path="/verify"  element={<Verify />} />
        <Route path="/otp"     element={<OTP />} />
        <Route path="/success" element={<Success />} />
        <Route path="*"        element={<Username />} />
      </Routes>
    </>
  );
}
