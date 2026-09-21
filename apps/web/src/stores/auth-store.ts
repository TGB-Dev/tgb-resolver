import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const TOKEN_KEY = "tgb:device-token";
export const LABEL_KEY = "tgb:device-label";
export const EXPIRY_KEY = "tgb:device-expires-at";
export const SESSION_KEY = "tgb:device-session-id";

const EXPIRY_WARNING_MS = 3_600_000;

export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[-\s]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

/** Join codes are fixed-length; UI caps normalized input at this length. */
export const JOIN_CODE_LENGTH = 6;

function isExpiredAt(value: string | null): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return parsed <= Date.now();
}

export enum AuthStatus {
  Anonymous = "anonymous",
  Authenticated = "authenticated",
  Expired = "expired",
}

export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthError(error: unknown): boolean {
  const status =
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status;
  return status === 401;
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(readStoredToken());
  const label = ref<string | null>(localStorage.getItem(LABEL_KEY));
  const expiresAt = ref<string | null>(localStorage.getItem(EXPIRY_KEY));
  const sessionId = ref<string | null>(localStorage.getItem(SESSION_KEY));
  // A token whose stored expiry is already past must not boot as authenticated:
  // after days away the server has purged/expired the session, so starting
  // authenticated would fire doomed requests (and sockets) with the dead token
  // until the first 401 flips us to expired. Expire proactively instead.
  const status = ref<AuthStatus>(
    !token.value
      ? AuthStatus.Anonymous
      : isExpiredAt(expiresAt.value)
        ? AuthStatus.Expired
        : AuthStatus.Authenticated,
  );

  const isAuthenticated = computed(
    () => status.value === AuthStatus.Authenticated && token.value !== null,
  );
  const expirySoon = computed(() => {
    if (!expiresAt.value) return false;
    return Date.parse(expiresAt.value) - Date.now() < EXPIRY_WARNING_MS;
  });

  function persist(
    nextToken: string,
    nextLabel: string,
    nextExpiry: string,
    nextSessionId: string,
  ) {
    token.value = nextToken;
    label.value = nextLabel;
    expiresAt.value = nextExpiry;
    sessionId.value = nextSessionId;
    status.value = AuthStatus.Authenticated;
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(LABEL_KEY, nextLabel);
    localStorage.setItem(EXPIRY_KEY, nextExpiry);
    localStorage.setItem(SESSION_KEY, nextSessionId);
  }

  function markExpired() {
    if (status.value === AuthStatus.Authenticated) {
      status.value = AuthStatus.Expired;
    }
  }

  function clear() {
    token.value = null;
    label.value = null;
    expiresAt.value = null;
    sessionId.value = null;
    status.value = AuthStatus.Anonymous;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LABEL_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  return {
    token,
    label,
    expiresAt,
    sessionId,
    status,
    isAuthenticated,
    expirySoon,
    persist,
    markExpired,
    clear,
  };
});
