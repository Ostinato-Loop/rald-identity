import { useNavigate } from "react-router-dom";
import { Shell } from "@/components/Shell";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <Shell>
      <div
        className="screen-enter"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "5rem",
            fontWeight: 800,
            color: "var(--muted)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          404
        </div>
        <h2 style={{ marginTop: 16, fontSize: "1.15rem", fontWeight: 700 }}>
          Page not found
        </h2>
        <p
          className="text-muted text-sm"
          style={{ maxWidth: 260, margin: "12px auto 0", lineHeight: 1.6 }}
        >
          This page doesn't exist in the RALD Identity system.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 32 }}
          onClick={() => navigate("/")}
        >
          Go to identity home
        </button>
        <p className="text-xs text-muted" style={{ marginTop: 16 }}>
          Looking to sign in?{" "}
          <button
            type="button"
            className="btn-link"
            style={{ color: "var(--green)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            Sign in here
          </button>
        </p>
      </div>
    </Shell>
  );
}
