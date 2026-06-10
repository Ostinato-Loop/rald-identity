// RALD Auth Client — browser-side calls to auth.rald.cloud
// LILCKY STUDIO LIMITED

const AUTH =
  (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ??
  "https://auth.rald.cloud";

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
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${AUTH}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? "Request failed";
    throw new ApiError(res.status, msg);
  }
  return data as T;
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
