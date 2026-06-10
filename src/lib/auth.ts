// RALD Auth Client — browser-side calls to auth.rald.cloud
// LILCKY STUDIO LIMITED

const AUTH =
  (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ??
  "https://auth.rald.cloud";

const FETCH_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS   = 1_200;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function raldFetch<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort("timeout"), FETCH_TIMEOUT_MS);

  const attemptFetch = async (): Promise<Response> => {
    return fetch(`${AUTH}${path}`, {
      method,
      credentials: "include",
      headers,
      signal: ctrl.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  try {
    let res: Response;
    try {
      res = await attemptFetch();
    } catch (networkErr) {
      // One automatic retry after RETRY_DELAY_MS for transient network failures
      if (ctrl.signal.aborted) {
        throw new ApiError(0, "Request timed out. Check your connection and try again.");
      }
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      res = await attemptFetch();
    }

    clearTimeout(tid);

    // Rate-limited — respect Retry-After if present
    if (res.status === 429) {
      const retryAfter = Number.parseInt(res.headers.get("Retry-After") ?? "30", 10);
      throw new ApiError(429, `Too many requests. Please wait ${retryAfter}s and try again.`);
    }

    // 5xx — one retry
    if (res.status >= 500) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      const retry = await attemptFetch();
      clearTimeout(tid);
      if (retry.status >= 500) {
        const data: unknown = await retry.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? "Server error. Try again in a moment.";
        throw new ApiError(retry.status, msg);
      }
      res = retry;
    }

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { error?: string }).error ?? "Request failed";
      throw new ApiError(res.status, msg);
    }
    return data as T;
  } catch (err) {
    clearTimeout(tid);
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Check your connection and try again.");
    }
    throw new ApiError(0, "Network error. Check your connection and try again.");
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UsernameCheckResult {
  available: boolean;
  username:  string;
  reason?:   string;
}

export interface RegisterUsernameResult {
  ok:               boolean;
  pending_user_id:  string;
  username:         string;
  rald_internal_id: string;
  reserved_mail:    string;
}

export interface SendSMSOTPResult {
  pinId: string;
}

export interface AuthUser {
  id:               string;
  username?:        string;
  email?:           string;
  name?:            string;
  role?:            string;
  rald_internal_id?: string;
}

export interface CompleteRegistrationResult {
  ok:    boolean;
  token: string;
  user:  AuthUser;
}

export interface SessionResult {
  ok:   boolean;
  user: AuthUser;
}

// ── Core auth ─────────────────────────────────────────────────────────────────

export const checkUsername = (username: string) =>
  raldFetch<UsernameCheckResult>(
    "GET",
    `/username/check/${encodeURIComponent(username)}`,
  );

export const registerUsername = (username: string, appId?: string) =>
  raldFetch<RegisterUsernameResult>("POST", "/auth/register-username", {
    username,
    ...(appId ? { app_id: appId } : {}),
  });

export const sendSMSOTP = (phone: string) =>
  raldFetch<SendSMSOTPResult>("POST", "/auth/send-otp", { phone });

export const sendEmailOTP = (email: string) =>
  raldFetch<{ ok: boolean }>("POST", "/auth/send-login-email-otp", { email });

export const completeRegistration = (payload: {
  pending_user_id: string;
  method: "sms" | "email";
  pinId?: string | null;
  pin?: string;
  phone?: string;
  email?: string;
  code?: string;
}) =>
  raldFetch<CompleteRegistrationResult>(
    "POST",
    "/auth/register-username/complete",
    payload,
  );

/** Save profile data (region, etc.) — fire-and-forget, never blocks auth flow. */
export const saveProfile = (
  token: string,
  data: { country?: string; region_state?: string },
): Promise<unknown> =>
  raldFetch<{ ok: boolean }>("PATCH", "/profiles/me", data, token).catch(() => null);

/** Get the current session from the worker (validates cookie). */
export const getSession = () =>
  raldFetch<SessionResult>("GET", "/session").catch(() => null);

// ── QR Code Login ─────────────────────────────────────────────────────────────

export interface QrScanResult {
  ok:         boolean;
  desktop_ip: string;
}

export const qrScan = (token: string) =>
  raldFetch<QrScanResult>("POST", `/auth/qr/scan/${token}`);

export const qrApprove = (token: string) =>
  raldFetch<{ ok: boolean }>("POST", `/auth/qr/approve/${token}`);

export const qrReject = (token: string) =>
  raldFetch<{ ok: boolean }>("POST", `/auth/qr/reject/${token}`);

// ── WebAuthn ──────────────────────────────────────────────────────────────────

export const webauthnLoginOptions = (username: string) =>
  raldFetch<Record<string, unknown>>("POST", "/auth/webauthn/login/options", {
    username,
  });

export const webauthnLoginVerify = (username: string, credential: unknown) =>
  raldFetch<{ ok: boolean; token: string; user: AuthUser }>(
    "POST",
    "/auth/webauthn/login/verify",
    { username, credential },
  );

// ── Username Login (return-user path) ─────────────────────────────────────────

export interface LoginUsernameResult {
  ok:              boolean;
  pending_user_id: string;
  method:          "sms" | "email";
  pinId?:          string;
  contact_hint:    string;
}

export const loginUsername = (username: string, appId?: string) =>
  raldFetch<LoginUsernameResult>("POST", "/auth/login-username", {
    username,
    ...(appId ? { app_id: appId } : {}),
  });

export const loginComplete = (payload: {
  user_id: string;
  method:  "sms" | "email";
  pinId?:  string;
  pin?:    string;
  code?:   string;
}) =>
  raldFetch<CompleteRegistrationResult>("POST", "/auth/login-username/complete", payload);
