import { Component, type ReactNode } from "react";
import { RaldMark } from "./Logo";

interface Props  { children: ReactNode; }
interface State  { error: Error | null; info: string | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[RALD] Unhandled render error:", error, info.componentStack);
    this.setState({ info: info.componentStack?.slice(0, 200) ?? null });
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
    try { sessionStorage.removeItem("rald.identity.onboarding"); } catch { /* noop */ }
    window.location.href = "/";
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="shell">
          <div aria-hidden className="aurora" />
          <div className="shell-inner">
            <header className="shell-header">
              <RaldMark size={40} />
            </header>
            <main
              className="shell-main"
              style={{ textAlign: "center", paddingTop: 64, flex: 1 }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "oklch(0.58 0.20 25 / 0.12)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 20px",
                  fontSize: 28,
                }}
              >
                ⚠️
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                Something went wrong
              </h2>
              <p
                className="text-muted text-sm"
                style={{ maxWidth: 280, margin: "12px auto 0", lineHeight: 1.6 }}
              >
                {this.state.error.message || "An unexpected error occurred."}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 32 }}
                onClick={this.handleReset}
              >
                Reload &amp; start over
              </button>
            </main>
            <footer className="shell-footer">
              Built in Africa · Works on any network
            </footer>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
