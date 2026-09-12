import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, expect, test, vi } from "vitest";
import { nextTick } from "vue";

import JoinScreen from "@/features/auth/join-screen.vue";

vi.mock("@tgb-resolver/contracts", () => ({
  generatedClient: {},
  joinWithCode: vi.fn(async () => ({
    data: { token: "tok", sessionId: "s1", label: "brave-fox", expiresAt: "2026-09-13T00:00:00Z" },
    error: undefined,
  })),
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
  expect(wrapper.text()).toContain("brave-fox");
  expect(window.location.search).not.toContain("join=");
});
