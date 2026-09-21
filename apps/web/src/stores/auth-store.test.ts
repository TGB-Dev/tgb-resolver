import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import {
  AuthStatus,
  EXPIRY_KEY,
  isAuthError,
  LABEL_KEY,
  normalizeJoinCode,
  SESSION_KEY,
  TOKEN_KEY,
  useAuthStore,
} from "@/stores/auth-store";

describe("normalizeJoinCode", () => {
  it("uppercases, strips dashes and spaces, maps confusables", () => {
    expect(normalizeJoinCode("ab-12c o")).toBe("AB12C0");
    expect(normalizeJoinCode("il")).toBe("11");
  });
});

describe("auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("starts anonymous without stored token", () => {
    expect(useAuthStore().isAuthenticated).toBe(false);
  });

  it("starts expired when the stored expiry is already past", () => {
    localStorage.setItem(TOKEN_KEY, "tok");
    localStorage.setItem(LABEL_KEY, "brave-fox");
    localStorage.setItem(EXPIRY_KEY, new Date(Date.now() - 24 * 3_600_000).toISOString());
    localStorage.setItem(SESSION_KEY, "s1");
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.status).toBe(AuthStatus.Expired);
  });

  it("stays authenticated when the stored expiry is in the future", () => {
    localStorage.setItem(TOKEN_KEY, "tok");
    localStorage.setItem(EXPIRY_KEY, new Date(Date.now() + 3_600_000).toISOString());
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(true);
  });

  it("persists token, label, expiry and session to localStorage", () => {
    const store = useAuthStore();
    store.persist("tok", "brave-fox", "2026-09-13T00:00:00Z", "s1");
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("tok");
    expect(localStorage.getItem(LABEL_KEY)).toBe("brave-fox");
    expect(localStorage.getItem(EXPIRY_KEY)).toBe("2026-09-13T00:00:00Z");
    expect(localStorage.getItem(SESSION_KEY)).toBe("s1");
    expect(store.sessionId).toBe("s1");
  });

  it("markExpired keeps the token for rejoin debugging but gates access", () => {
    const store = useAuthStore();
    store.persist("tok", "brave-fox", "2026-09-13T00:00:00Z", "s1");
    store.markExpired();
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("tok");
  });

  it("clear wipes everything", () => {
    const store = useAuthStore();
    store.persist("tok", "brave-fox", "2026-09-13T00:00:00Z", "s1");
    store.clear();
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("detects 401 shapes from the generated client", () => {
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError({ response: { status: 401 } })).toBe(true);
    expect(isAuthError({ status: 409 })).toBe(false);
    expect(isAuthError(new Error("boom"))).toBe(false);
  });

  it("flags expiry within the warning window", () => {
    const store = useAuthStore();
    store.persist("tok", "brave-fox", new Date(Date.now() + 60_000).toISOString(), "s1");
    expect(store.expirySoon).toBe(true);
  });
});
