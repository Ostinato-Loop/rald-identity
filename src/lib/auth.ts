// RALD Auth Client — browser-side calls to auth.rald.cloud
// LILCKY STUDIO LIMITED

const AUTH = (import.meta.env.VITE_RALD_AUTH_URL as string | undefined) ?? "https://auth.rald.cloud";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function raldFetch<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${AUTH}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? "Request failed";
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export interface UsernameCheckResult {
  available: boolean;
  username: string;
  reason?: string;
}

export interface RegisterUsernameResult {
  ok: boolean;
  pending_user_id: string;
  username: string;
  rald_internal_id: string;
  reserved_mail: string;
}

export interface SendSMSOTPResult {
  pinId: string;
}

export interface AuthUser {
  id: string;
  username?: string;
  name?: string;
  role?: string;
  rald_internal_id?: string;
}

export interface CompleteRegistrationResult {
  ok: boolean;
  token: string;
  user: AuthUser;
}

export const checkUsername = (username: string) =>
  raldFetch<UsernameCheckResult>("GET", `/username/check/${encodeURIComponent(username)}`);

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
  pinId?: string;
  pin?: string;
  phone?: string;
  email?: string;
  code?: string;
}) => raldFetch<CompleteRegistrationResult>("POST", "/auth/register-username/complete", payload);
