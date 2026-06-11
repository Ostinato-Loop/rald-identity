// RALD Identity — Dashboard
  // Route: /dashboard
  // Smart router: validates session then forwards to app.rald.cloud (RALD ecosystem hub).
  // Users should NOT be left on profiles.rald.cloud after auth — they belong on app.rald.cloud.
  // LILCKY STUDIO LIMITED

  import { useEffect } from "react";
  import { useNavigate } from "react-router-dom";
  import { Shell }       from "@/components/Shell";
  import { RaldMark }    from "@/components/Logo";
  import { useStore, setState, resetFlow } from "@/lib/store";
  import { getSession }  from "@/lib/auth";
  import { Loader2 }     from "lucide-react";

  const APP_RALD_CLOUD = "https://app.rald.cloud";

  export function Dashboard() {
    const navigate    = useNavigate();
    const [store]     = useStore();

    useEffect(() => {
      let mounted = true;

      // If no in-memory token, send to login immediately
      if (!store.token) {
        navigate("/login", { replace: true });
        return;
      }

      // Validate the session then forward to app.rald.cloud with SSO token
      getSession().then(result => {
        if (!mounted) return;
        if (!result?.ok) {
          // Session invalid — clear and redirect to login
          setState({ token: null });
          resetFlow();
          navigate("/login", { replace: true });
          return;
        }
        // Session valid — forward to RALD ecosystem hub with token
        const token = store.token;
        const destination = token
          ? `${APP_RALD_CLOUD}?rald_token=${encodeURIComponent(token)}&app_id=rald-app`
          : APP_RALD_CLOUD;
        window.location.replace(destination);
      });

      return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Show a minimal loading screen while validating
    return (
      <Shell>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            color: "var(--muted)",
          }}
        >
          <div style={{ position: "relative" }}>
            <RaldMark size={56} />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: 20,
                border: "2px solid oklch(0.52 0.15 150 / 0.2)",
                animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />
            <span className="text-sm">Taking you to RALD…</span>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 4, textAlign: "center", maxWidth: 240 }}>
            Your RALD identity is verified.
            <br />Redirecting to the ecosystem hub.
          </p>
        </div>
      </Shell>
    );
  }
  