import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import * as v from "valibot";
import { beforeEach, expect, test, vi } from "vitest";
import { nextTick } from "vue";

import JoinScreen from "@/features/auth/join-screen.vue";

vi.mock("@tgb-resolver/contracts", () => ({
  generatedClient: {},
  joinWithCode: vi.fn(async () => ({
    data: { token: "tok", sessionId: "s1", label: "brave-fox", expiresAt: "2026-09-13T00:00:00Z" },
    error: undefined,
  })),
  vJoinInputBodyWritable: v.strictObject({ code: v.string() }),
  vJoinOutputBody: v.strictObject({
    token: v.string(),
    sessionId: v.string(),
    label: v.string(),
    expiresAt: v.string(),
  }),
}));

vi.mock("@/lib/realtime-client", () => ({
  reconnectRealtime: vi.fn(),
}));

import { joinWithCode } from "@tgb-resolver/contracts";

import { reconnectRealtime } from "@/lib/realtime-client";
import { useAuthStore } from "@/stores/auth-store";

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
});

test("magic link auto-submits normalized code and shows the device label", async () => {
  window.history.replaceState(null, "", "/?join=ab-12cd");
  const wrapper = mount(JoinScreen);
  await flush();
  await nextTick();
  await flush();
  await nextTick();
  expect(joinWithCode).toHaveBeenCalledWith({
    client: expect.anything(),
    body: { code: "AB12CD" },
  });
  expect(wrapper.text()).toContain("brave-fox");
  expect(window.location.search).not.toContain("join=");
});

test("lowercase input with spaces and newline is trimmed and uppercased", async () => {
  window.history.replaceState(null, "", "/?join=%20ab%2012cd%0A");
  mount(JoinScreen);
  await flush();
  await nextTick();
  await flush();
  await nextTick();
  expect(joinWithCode).toHaveBeenCalledWith({
    client: expect.anything(),
    body: { code: "AB12CD" },
  });
});

test("input allows separators so pasted codes survive normalization", async () => {
  const wrapper = mount(JoinScreen);
  const input = wrapper.find("input");
  // Raw entry is longer than 6 chars but normalizes down to a full code.
  await input.setValue("ab-12cd");
  expect((input.element as HTMLInputElement).value).toBe("AB12CD");
});

test("pasting a code with a dash fills the normalized code and joins", async () => {
  const wrapper = mount(JoinScreen);
  await wrapper.find("input").trigger("paste", {
    clipboardData: { getData: () => "ab-12cd" },
  });
  await flush();
  await nextTick();
  await flush();
  await nextTick();
  expect(joinWithCode).toHaveBeenCalledWith({
    client: expect.anything(),
    body: { code: "AB12CD" },
  });
  expect(wrapper.text()).toContain("brave-fox");
});

test("successful join waits for Continue before authenticating", async () => {
  window.history.replaceState(null, "", "/?join=ab12cd");
  const wrapper = mount(JoinScreen);
  await flush();
  await nextTick();
  await flush();
  await nextTick();
  expect(joinWithCode).toHaveBeenCalled();
  // Confirm step is visible but the store is still anonymous: AuthGate must
  // keep this screen mounted so the user can actually press Continue.
  expect(wrapper.text()).toContain("brave-fox");
  expect(useAuthStore().isAuthenticated).toBe(false);
  await wrapper.find("button").trigger("click");
  await flush();
  await nextTick();
  expect(useAuthStore().isAuthenticated).toBe(true);
  expect(reconnectRealtime).toHaveBeenCalled();
});

test("short code shows an inline hint instead of calling join", async () => {
  window.history.replaceState(null, "", "/?join=ab");
  const wrapper = mount(JoinScreen);
  await flush();
  await nextTick();
  expect(joinWithCode).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain("6-character");
});
