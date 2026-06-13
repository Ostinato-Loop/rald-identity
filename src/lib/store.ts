import { useState, useEffect } from "react";

  export type OnboardingMethod = "sms" | "email" | null;

  export interface OnboardingState {
    username:           string;
    method:             OnboardingMethod;
    contact:            string;
    appId:              string | null;
    redirectTo:         string | null;
    pendingUserId:      string | null;
    pinId:              string | null;
    token:              string | null;
    loginFlow:          boolean;
    country:            string | null;
    regionState:        string | null;
    needsUsername:      boolean;
    migrationMode:      boolean;
    // Phase 6: smart-login
    smartLoginFlow:     boolean;
    identifier:         string | null;
    // Email OTP: sessionToken JWT returned by /auth/send-login-email-otp
    // Required by /auth/register-username/complete for email verification
    emailSessionToken:  string | null;
  }

  const INITIAL: OnboardingState = {
    username:           "",
    method:             null,
    contact:            "",
    appId:              null,
    redirectTo:         null,
    pendingUserId:      null,
    pinId:              null,
    token:              null,
    loginFlow:          false,
    country:            null,
    regionState:        null,
    needsUsername:      false,
    migrationMode:      false,
    smartLoginFlow:     false,
    identifier:         null,
    emailSessionToken:  null,
  };

  const KEY            = "rald.identity.onboarding";
  const LAST_ID_KEY    = "rald.last.identifier";

  // ── localStorage helpers (non-sensitive: last login identifier only) ──────────

  export function getLastIdentifier(): string {
    try { return localStorage.getItem(LAST_ID_KEY) ?? ""; } catch { return ""; }
  }

  export function setLastIdentifier(value: string) {
    try {
      if (value) { localStorage.setItem(LAST_ID_KEY, value); }
    } catch { /* noop */ }
  }

  // ── sessionStorage helpers (sensitive flow state) ──────────────────────────────

  function persist(s: OnboardingState) {
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
  }

  function restore(): OnboardingState {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? { ...INITIAL, ...(JSON.parse(raw) as Partial<OnboardingState>) } : { ...INITIAL };
    } catch {
      return { ...INITIAL };
    }
  }

  let _state: OnboardingState = restore();
  const _subs = new Set<() => void>();

  function getState(): OnboardingState { return _state; }

  export function setState(patch: Partial<OnboardingState>) {
    _state = { ..._state, ...patch };
    persist(_state);
    for (const fn of _subs) { fn(); }
  }

  /** Clear flow state (keep appId + redirectTo, wipe auth progress) */
  export function resetFlow() {
    setState({
      username:           "",
      method:             null,
      contact:            "",
      pendingUserId:      null,
      pinId:              null,
      token:              null,
      loginFlow:          false,
      country:            null,
      regionState:        null,
      needsUsername:      false,
      migrationMode:      false,
      smartLoginFlow:     false,
      identifier:         null,
      emailSessionToken:  null,
    });
  }

  export function useStore(): [OnboardingState, typeof setState] {
    const [snap, setSnap] = useState<OnboardingState>(() => getState());
    useEffect(() => {
      const unsub = () => setSnap({ ...getState() });
      _subs.add(unsub);
      return () => { _subs.delete(unsub); };
    }, []);
    return [snap, setState];
  }

  // ── Open-redirect protection ───────────────────────────────────────────────────
  const ALLOWED_ORIGINS = new Set([
    "https://app.rald.cloud",
    "https://loop.rald.cloud",
    "https://messenger.rald.cloud",
    "https://payrald.rald.cloud",
    "https://ai.rald.cloud",
    "https://business.loop.rald.cloud",
    "https://mail.rald.cloud",
    "https://voice.rald.cloud",
    "https://dispatch.rald.cloud",
    "https://profiles.rald.cloud",
    "https://profile.rald.cloud",
  ]);

  export function validateRedirectUrl(raw: string): string | null {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return null;
      if (ALLOWED_ORIGINS.has(url.origin)) return raw;
      if (url.hostname.endsWith(".rald.cloud")) return raw;
      return null;
    } catch {
      return null;
    }
  }

  // ── Redirect engine ────────────────────────────────────────────────────────────
  const APP_URLS: Record<string, string> = {
    loop:            "https://loop.rald.cloud",
    messenger:       "https://messenger.rald.cloud",
    payrald:         "https://payrald.rald.cloud",
    "rald-ai":       "https://ai.rald.cloud",
    "loop-business": "https://business.loop.rald.cloud",
    mail:            "https://mail.rald.cloud",
    voice:           "https://voice.rald.cloud",
    dispatch:        "https://dispatch.rald.cloud",
  };

  /**
   * Build the post-auth redirect URL.
   * Default destination is app.rald.cloud — the RALD ecosystem hub.
   *
   * SESSION-TOKEN-001 (2026-06-13): rald_token (master JWT) is NO LONGER
   * appended to redirect URLs. The rald_session HttpOnly cookie
   * (Domain=.rald.cloud, 30-day TTL) is propagated automatically by the
   * browser to all *.rald.cloud subdomains, eliminating the need for a
   * token in the URL. Destination apps call their own /auth/silent endpoint
   * which reads the rald_session cookie and issues a product-scoped session.
   *
   * app_id is retained as a non-sensitive routing hint so receiving apps
   * know which product context to initialise.
   */
  export function resolveRedirectUrl(state: OnboardingState): string {
    let base: string;
    if (state.redirectTo && validateRedirectUrl(state.redirectTo)) {
      base = state.redirectTo;
    } else if (state.appId && APP_URLS[state.appId]) {
      base = APP_URLS[state.appId];
    } else {
      // Default: the RALD ecosystem hub
      base = "https://app.rald.cloud";
    }

    // Only append app_id as a routing hint — never the master JWT
    if (!state.appId) return base;

    try {
      const url = new URL(base);
      url.searchParams.set("app_id", state.appId);
      return url.toString();
    } catch {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}app_id=${encodeURIComponent(state.appId)}`;
    }
  }

  export const APP_LABELS: Record<string, string> = {
    loop:            "Loop",
    messenger:       "Messenger",
    payrald:         "PayRald",
    "rald-ai":       "RALD AI",
    "loop-business": "Loop Business",
    mail:            "RALD Mail",
    voice:           "RALD Voice",
    dispatch:        "Dispatch",
    "rald-app":      "RALD",
  };
