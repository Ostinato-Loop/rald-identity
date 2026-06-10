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
}

const INITIAL: OnboardingState = {
  username:      "",
  method:        null,
  contact:       "",
  appId:         null,
  redirectTo:    null,
  pendingUserId: null,
  pinId:         null,
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
  _subs.forEach(fn => fn());
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

export function resolveRedirectUrl(state: OnboardingState): string {
  if (state.redirectTo) return state.redirectTo;
  if (state.appId && APP_URLS[state.appId]) return APP_URLS[state.appId];
  return "https://profiles.rald.cloud/dashboard";
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
