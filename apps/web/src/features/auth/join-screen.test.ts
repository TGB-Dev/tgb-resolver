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

import { joinWithCode } from "@tgb-resolver/contracts";

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

test("input is capped at 6 characters", () => {
  const wrapper = mount(JoinScreen);
  expect(wrapper.find("input").attributes("maxlength")).toBe("6");
});

test("short code shows an inline hint instead of calling join", async () => {
  window.history.replaceState(null, "", "/?join=ab");
  const wrapper = mount(JoinScreen);
  await flush();
  await nextTick();
  expect(joinWithCode).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain("6-character");
});
