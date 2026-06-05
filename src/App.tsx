import { useState } from "react";

const ENDPOINTS = [
  { method: "POST", path: "/auth/login",             desc: "Password-based login → JWT" },
  { method: "POST", path: "/auth/register",          desc: "Create user account with RALD ID" },
  { method: "POST", path: "/auth/send-otp",          desc: "Send OTP via SMS (Termii)" },
  { method: "POST", path: "/auth/verify-otp",        desc: "Verify SMS OTP → JWT or new-user" },
  { method: "POST", path: "/auth/send-login-email-otp", desc: "Send OTP via email (Resend)" },
  { method: "POST", path: "/auth/verify-login-email-otp", desc: "Verify email OTP → JWT" },
  { method: "POST", path: "/auth/request-reset",     desc: "Request password reset code" },
  { method: "POST", path: "/auth/reset-password",    desc: "Reset password with code" },
  { method: "GET",  path: "/auth/me",                desc: "Authenticated user profile" },
  { method: "GET",  path: "/devices",                desc: "List authenticated devices" },
  { method: "POST", path: "/devices/:id/trust",      desc: "Trust a device" },
  { method: "POST", path: "/devices/:id/remove",     desc: "Remove a device" },
  { method: "GET",  path: "/auth/sessions",          desc: "Active sessions list" },
  { method: "POST", path: "/auth/sessions/:id/revoke", desc: "Revoke a session" },
  { method: "POST", path: "/auth/sessions/revoke-all", desc: "Revoke all sessions" },
  { method: "POST", path: "/sso/exchange",           desc: "Exchange RALD token → Clerk SSO token" },
  { method: "POST", path: "/provision/user",         desc: "Provision new user (server-to-server)" },
];

const FEATURES = [
  { icon: "🔑", color: "rgba(255,212,0,0.12)", title: "Single-Input Auth", desc: "Email or phone — one field auto-detects the identity type and routes to the correct OTP provider." },
  { icon: "📱", color: "rgba(0,255,136,0.12)", title: "Termii SMS OTP", desc: "Nigerian-first SMS delivery via Termii with registered sender ID. Fallback to email via Resend." },
  { icon: "🪪", color: "rgba(0,102,255,0.12)", title: "RALD ID", desc: "Every user gets a unique RALD-XXXXXX identifier — portable across all RALD ecosystem apps." },
  { icon: "🔐", color: "rgba(168,85,247,0.12)", title: "JWT + Sessions", desc: "RS256-signed tokens with device management, session revocation, and trusted-device tracking." },
  { icon: "🔄", color: "rgba(0,191,255,0.12)", title: "Clerk Bridge", desc: "Seamless Clerk token exchange for hybrid deployments — bring RALD auth into existing Clerk flows." },
  { icon: "⚡", color: "rgba(255,122,0,0.12)", title: "Cloudflare Workers", desc: "Edge-deployed auth API at auth.rald.cloud — P95 < 50ms globally, zero cold starts." },
];

const INTEGRATIONS = [
  { icon: "⚛️",  name: "React",    note: "useRaldAuth hook" },
  { icon: "▲",   name: "Next.js",  note: "Middleware + server" },
  { icon: "💚",  name: "Vue",      note: "Composables" },
  { icon: "🟠",  name: "Node.js",  note: "JWT verify util" },
  { icon: "🔵",  name: "TypeScript", note: "Full types" },
  { icon: "⚙️",  name: "Webhooks",  note: "Event hooks" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} style={{
      background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--muted)",
      cursor: "pointer", fontFamily: "inherit",
    }}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function App() {
  const [_copied, setCopied] = useState(false);

  const copyInstall = () => {
    navigator.clipboard.writeText("npm install @rald/auth-sdk").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sdkCode = `import { RaldAuth } from "@rald/auth-sdk";

const auth = new RaldAuth({
  baseUrl: "https://auth.rald.cloud",
  getToken: () => localStorage.getItem("rald_token"),
  onTokenChange: (token) => {
    if (token) localStorage.setItem("rald_token", token);
    else localStorage.removeItem("rald_token");
  },
});

// Password login
const { token, user } = await auth.login(email, password);

// OTP (email or phone — auto-detected)
const { pinId } = await auth.sendOtp("+2348012345678");
const result = await auth.verifyOtp("+2348012345678", "123456", { pinId });

// Authenticated user
const me = await auth.me();
console.log(me.raldId); // "RALD-A3F9KZ"`;

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <div className="nav-logo">
            <img src="/rald-logo.png" alt="RALD" height={32} width={32} style={{ objectFit: "contain", marginRight: 8, verticalAlign: "middle" }} />
            RALD<span style={{ color: "var(--yellow)" }}>·</span>IDENTITY
            <span className="badge">BETA</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#quickstart">Quick Start</a>
            <a href="#api">API Reference</a>
            <a href="#integrations">Integrations</a>
            <a href="https://profiles.rald.cloud" target="_blank" rel="noreferrer" className="nav-cta">Sign In</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow">
            <span className="dot" />
            Production ready — v1.0.0
          </div>
          <h1>
            Auth that <span className="gradient-text">just works</span>
            <br />for the RALD ecosystem.
          </h1>
          <p className="hero-sub">
            RALD Identity is a unified authentication platform — single-input OTP,
            password auth, session management, and a TypeScript SDK for every RALD app.
          </p>
          <div className="hero-actions">
            <a href="#quickstart" className="btn-primary">Quick Start →</a>
            <a href="#api" className="btn-ghost">API Reference</a>
          </div>
          <div
            className="install-bar"
            onClick={copyInstall}
            onKeyDown={(e) => e.key === "Enter" && copyInstall()}
            title="Click to copy"
            role="button"
            tabIndex={0}
          >
            <code>npm install @rald/auth-sdk</code>
            <span className="copy-hint">click to copy</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-label">Platform features</div>
          <div className="section-title">Everything auth.<br />Nothing extra.</div>
          <p className="section-sub">
            Purpose-built for the RALD ecosystem — Nigerian-first OTP delivery,
            Clerk bridge, and edge-speed at auth.rald.cloud.
          </p>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon" style={{ background: f.color }}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RALD ID */}
      <section className="rald-id-section">
        <div className="container">
          <div className="rald-id-card">
            <div className="section-label">RALD ID</div>
            <h2 className="section-title" style={{ marginBottom: 8 }}>One ID. All of RALD.</h2>
            <p style={{ color: "var(--muted)", maxWidth: 500, margin: "0 auto 8px", fontSize: 15 }}>
              Every user provisioned through RALD Identity receives a unique, human-readable identifier
              that travels with them across every app in the ecosystem.
            </p>
            <div className="rald-id-display">
              RALD<span>-</span>A3F9KZ
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              6-character alphanumeric suffix · auto-assigned at registration · immutable
            </p>
          </div>
        </div>
      </section>

      {/* QUICK START */}
      <section className="quickstart" id="quickstart">
        <div className="container">
          <div className="section-label">Quick Start</div>
          <div className="section-title">Live in under 5 minutes.</div>
          <div className="quickstart-grid">
            <div className="step-list">
              <div className="step">
                <div className="step-num">1</div>
                <div>
                  <h4>Install the SDK</h4>
                  <p>Add <code style={{ color: "var(--green)", fontSize: 12 }}>@rald/auth-sdk</code> to your project. Works in browser, Node.js, Deno, and Cloudflare Workers.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <div>
                  <h4>Create a RaldAuth instance</h4>
                  <p>Point it at <code style={{ color: "var(--green)", fontSize: 12 }}>auth.rald.cloud</code> and provide your token storage callbacks.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <div>
                  <h4>Call auth methods</h4>
                  <p>All methods return typed promises — login, OTP send/verify, me, sessions, devices. Full TypeScript support.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-num">4</div>
                <div>
                  <h4>Protect routes</h4>
                  <p>Use the JWT from <code style={{ color: "var(--green)", fontSize: 12 }}>auth.me()</code> to protect server routes. Verify with RALD public key.</p>
                </div>
              </div>
            </div>
            <div className="code-block">
              <div className="code-block-header">
                <span className="code-block-title">auth.ts</span>
                <CopyButton text={sdkCode} />
              </div>
              <pre>
                <span className="c-kw">import</span>
                {" {"}<span className="c-type"> RaldAuth </span>{"}"}
                <span className="c-kw"> from </span>
                <span className="c-str">"@rald/auth-sdk"</span>
                {";\n\n"}
                <span className="c-kw">const</span>
                {" auth = "}
                <span className="c-kw">new</span>
                {" "}
                <span className="c-fn">RaldAuth</span>
                {"({\n"}
                {"  baseUrl: "}
                <span className="c-str">"https://auth.rald.cloud"</span>
                {",\n"}
                {"  getToken: () => localStorage."}
                <span className="c-fn">getItem</span>
                {`("rald_token"),\n`}
                {"});\n\n"}
                <span className="c-comment">{"// Password login\n"}</span>
                <span className="c-kw">const</span>
                {" { token, user } = "}
                <span className="c-kw">await</span>
                {" auth."}
                <span className="c-fn">login</span>
                {"(email, password);\n\n"}
                <span className="c-comment">{"// OTP — auto-detects email vs phone\n"}</span>
                <span className="c-kw">const</span>
                {" { pinId } = "}
                <span className="c-kw">await</span>
                {" auth."}
                <span className="c-fn">sendOtp</span>
                {`("+2348012345678");\n`}
                <span className="c-kw">const</span>
                {" result = "}
                <span className="c-kw">await</span>
                {" auth."}
                <span className="c-fn">verifyOtp</span>
                {`(\n  "+2348012345678", "123456", { pinId }\n);\n\n`}
                <span className="c-comment">{"// Current user\n"}</span>
                <span className="c-kw">const</span>
                {" me = "}
                <span className="c-kw">await</span>
                {" auth."}
                <span className="c-fn">me</span>
                {"();\n"}
                {"console."}
                <span className="c-fn">log</span>
                {"(me.raldId); "}
                <span className="c-comment">{"// RALD-A3F9KZ"}</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* API REFERENCE */}
      <section className="endpoints" id="api">
        <div className="container">
          <div className="section-label">API Reference</div>
          <div className="section-title">REST API at auth.rald.cloud</div>
          <p className="section-sub" style={{ marginBottom: 36 }}>
            All endpoints accept and return JSON. Authenticated routes require{" "}
            <code style={{ color: "var(--green)", fontSize: 13 }}>Authorization: Bearer {"<token>"}</code>.
          </p>
          <div className="endpoint-list">
            {ENDPOINTS.map((ep) => (
              <div key={ep.path} className="endpoint-row">
                <span className={`method-badge ${ep.method === "POST" ? "method-post" : ep.method === "GET" ? "method-get" : "method-del"}`}>
                  {ep.method}
                </span>
                <span className="endpoint-path">{ep.path}</span>
                <span className="endpoint-desc">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="integrations" id="integrations">
        <div className="container">
          <div className="section-label">Integrations</div>
          <div className="section-title">Works with your stack.</div>
          <p className="section-sub">
            The <code style={{ color: "var(--green)" }}>@rald/auth-sdk</code> ships full TypeScript types
            and works anywhere JavaScript runs.
          </p>
          <div className="integration-cards">
            {INTEGRATIONS.map((i) => (
              <div key={i.name} className="int-card">
                <div className="int-icon">{i.icon}</div>
                <div className="int-name">{i.name}</div>
                <div className="int-note">{i.note}</div>
              </div>
            ))}
          </div>

          {/* Auth flows section */}
          <div style={{ marginTop: 56 }}>
            <div className="gradient-border" style={{ display: "inline-block", width: "100%" }}>
              <div className="gradient-border-inner">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 32 }}>
                  {[
                    { title: "Password Auth", items: ["Email + password login", "Bcrypt hashed storage", "Password reset via email OTP"] },
                    { title: "OTP Auth", items: ["SMS via Termii (NG-first)", "Email via Resend", "60-second expiry, 6 digits"] },
                    { title: "Session Management", items: ["Device tracking", "Geo + browser metadata", "Per-session revocation"] },
                    { title: "SSO Bridge", items: ["Clerk token exchange", "Custom redirectUrl flow", "WorkOS preserved"] },
                  ].map((section) => (
                    <div key={section.title}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--yellow)" }}>
                        {section.title}
                      </h4>
                      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                        {section.items.map((item) => (
                          <li key={item} style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 8 }}>
                            <span style={{ color: "var(--green)" }}>→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">RALD IDENTITY</div>
              <div className="footer-note" style={{ marginTop: 4 }}>
                © 2026 LILCKY STUDIO LIMITED · All rights reserved
              </div>
            </div>
            <div className="footer-links">
              <a href="https://profiles.rald.cloud">Sign In</a>
              <a href="https://profile.rald.cloud">Profile</a>
              <a href="https://github.com/Ostinato-Loop" target="_blank" rel="noreferrer">GitHub</a>
              <a href="mailto:identity@rald.cloud">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
