import { useState, useEffect } from "react";

export type OnboardingMethod = "sms" | "email" | null;

export interface OnboardingState {
  username:      string;
  method:        OnboardingMethod;
  contact:       string;
  appId:         string | null;
  redirectTo:    string | null;
  pendingUserId: string | null;
  pinId:         string | null;
  token:         string | null;
  loginFlow:     boolean;
  country:       string | null;
  regionState:   string | null;
}

const INITIAL: OnboardingState = {
  username:      "",
  method:        null,
  contact:       "",
  appId:         null,
  redirectTo:    null,
  pendingUserId: null,
  pinId:         null,
  token:         null,
  loginFlow:     false,
  country:       null,
  regionState:   null,
};

const KEY = "rald.identity.onboarding";

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

export function useStore(): [OnboardingState, typeof setState] {
  const [snap, setSnap] = useState<OnboardingState>(() => getState());
  useEffect(() => {
    const unsub = () => setSnap({ ...getState() });
    _subs.add(unsub);
    return () => { _subs.delete(unsub); };
  }, []);
  return [snap, setState];
}

// Redirect engine
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
 *
 * SSO-TOKEN-001: After a successful registration / auth flow, rald-identity must
 * append the issued rald_token (and app_id) as query params so the calling app
 * can exchange them for a session.  Without this the callback page in the calling
 * app has no token to exchange and the user sees a blank/loading screen forever.
 */
export function resolveRedirectUrl(state: OnboardingState): string {
  let base: string;
  if (state.redirectTo) {
    base = state.redirectTo;
  } else if (state.appId && APP_URLS[state.appId]) {
    base = APP_URLS[state.appId];
  } else {
    base = "https://profiles.rald.cloud/dashboard";
  }

  if (!state.token) return base;

  try {
    const url = new URL(base);
    url.searchParams.set("rald_token", state.token);
    if (state.appId) url.searchParams.set("app_id", state.appId);
    return url.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    const appPart = state.appId ? `&app_id=${encodeURIComponent(state.appId)}` : "";
    return `${base}${sep}rald_token=${encodeURIComponent(state.token)}${appPart}`;
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
};
