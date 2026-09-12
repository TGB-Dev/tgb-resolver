<script setup lang="ts">
import { Field } from "@ark-ui/vue";
import { ScanLine } from "@lucide/vue";
import { css } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import {
  generatedClient,
  joinWithCode,
  vJoinInputBodyWritable,
  vJoinOutputBody,
} from "@tgb-resolver/contracts";
import * as v from "valibot";
import { onMounted, ref, useTemplateRef } from "vue";

import { useQrScanner } from "@/features/auth/use-qr-scanner";
import { parseErrorMessage } from "@/features/shared/ui/error-message";
import { toaster } from "@/features/shared/ui/toaster";
import { normalizeJoinCode, useAuthStore } from "@/stores/auth-store";

const authStore = useAuthStore();
const { error: scanError, scanOnce } = useQrScanner();

const code = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const showScanner = ref(false);
const pendingLabel = ref<string | null>(null);
const pendingJoin = ref<{ token: string; label: string; expiresAt: string; sessionId: string } | null>(
  null,
);
const videoRef = useTemplateRef<HTMLVideoElement>("videoRef");
const buttonClasses = button();

const overlay = css({
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  bg: "bg.canvas",
  zIndex: 10000,
  p: 4,
});
const card = css({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  w: "full",
  maxW: "24rem",
  bg: "bg.default",
  borderWidth: "1px",
  borderColor: "border.default",
  rounded: "l2",
  p: 6,
});
const title = css({ fontSize: "xl", fontWeight: "semibold" });
const hint = css({ fontSize: "sm", color: "fg.muted" });
const input = css({
  fontFamily: "mono",
  fontSize: "lg",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  textAlign: "center",
  borderWidth: "1px",
  borderColor: "border.default",
  rounded: "l1",
  px: 3,
  py: 2,
  w: "full",
  bg: "bg.default",
});
const errorText = css({ fontSize: "sm", color: "fg.error" });
const video = css({ w: "full", rounded: "l1", bg: "bg.subtle" });

function codeFromScanned(raw: string): string {
  try {
    const url = new URL(raw);
    return url.searchParams.get("join") ?? raw;
  } catch {
    return raw;
  }
}

async function submit(raw: string) {
  if (busy.value) return;
  const normalized = normalizeJoinCode(raw);
  code.value = normalized;
  const input = v.safeParse(vJoinInputBodyWritable, { code: normalized });
  if (!input.success || normalized.length < 6) {
    error.value = "Enter the 6-character code from the operator.";
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const { data, error: joinError } = await joinWithCode({
      client: generatedClient,
      body: { code: normalized },
    });
    if (joinError || !data) {
      const status = (joinError as { status?: number })?.status;
      if (status === 429) {
        error.value = "Too many tries - wait a minute.";
      } else if (status === undefined) {
        error.value = "Can't reach the server - check the network.";
      } else {
        error.value = "Wrong code - check with the operator.";
      }
      return;
    }
    const output = v.safeParse(vJoinOutputBody, data);
    if (!output.success) {
      error.value = "Bad server response - try again.";
      return;
    }
    pendingLabel.value = output.output.label;
    pendingJoin.value = {
      token: output.output.token,
      label: output.output.label,
      expiresAt: output.output.expiresAt,
      sessionId: output.output.sessionId,
    };
  } catch (e) {
    error.value = parseErrorMessage(e);
  } finally {
    busy.value = false;
  }
}

async function confirm() {
  if (!pendingJoin.value) return;
  authStore.persist(
    pendingJoin.value.token,
    pendingJoin.value.label,
    pendingJoin.value.expiresAt,
    pendingJoin.value.sessionId,
  );
  try {
    const { reconnectRealtime } = await import("@/lib/realtime-client");
    reconnectRealtime();
  } catch (e) {
    toaster.create({
      title: "Realtime reconnect failed",
      description: `${parseErrorMessage(e)} Reload the page.`,
      type: "error",
    });
  }
}

async function startScan() {
  showScanner.value = true;
  error.value = null;
  await Promise.resolve();
  const el = videoRef.value;
  if (!el) return;
  try {
    await scanOnce(el, (raw) => {
      showScanner.value = false;
      void submit(codeFromScanned(raw));
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Camera unavailable - type the code instead.";
    showScanner.value = false;
  }
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const magic = params.get("join");
  if (magic) {
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState(null, "", url.toString());
    void submit(magic);
  }
});
</script>

<template>
  <div :class="overlay">
    <div :class="card">
      <template v-if="pendingLabel">
        <div :class="title">You're joining as {{ pendingLabel }}</div>
        <div :class="hint">Show this name to the operator if anything looks wrong.</div>
        <button type="button" :class="buttonClasses" @click="confirm">Continue</button>
      </template>
      <template v-else>
        <div :class="title">Join show</div>
        <div v-if="authStore.status === 'expired'" :class="hint">
          Session expired - enter the current code to rejoin.
        </div>
        <div v-else :class="hint">Ask the operator for the code or scan their QR.</div>
        <Field.Root :invalid="!!error">
          <Field.Input
            v-model="code"
            :class="input"
            placeholder="------"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            :disabled="busy"
            @keydown.enter="submit(code)"
          />
          <Field.ErrorText v-if="error" :class="errorText">{{ error }}</Field.ErrorText>
        </Field.Root>
        <video v-if="showScanner" ref="videoRef" :class="video" muted playsinline />
        <div v-if="scanError" :class="errorText">{{ scanError }}</div>
        <button type="submit" :class="buttonClasses" :disabled="busy" @click="submit(code)">
          {{ busy ? "Joining..." : "Join" }}
        </button>
        <button type="button" :class="button({ variant: 'ghost' })" @click="startScan">
          <ScanLine :size="16" aria-hidden />
          Scan QR instead
        </button>
      </template>
    </div>
  </div>
</template>
