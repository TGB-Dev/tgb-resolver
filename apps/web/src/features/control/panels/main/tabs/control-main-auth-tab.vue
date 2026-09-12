<script setup lang="ts">
import { QrCode } from "@ark-ui/vue";
import { Copy, LogOut, RefreshCw } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { Box } from "@styled-system/jsx";
import { button, code, gridTableRow, qrCode } from "@styled-system/recipes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  type AuthSessionSnapshot,
  generatedClient,
  getJoinCode,
  listSessions,
  revokeSession,
  rotateJoinCode,
  vTgbResolverServerFeaturesAuthSessionsEndpointResponse,
} from "@tgb-resolver/contracts";
import * as v from "valibot";
import { computed, watch } from "vue";

import { formatLastSeen } from "@/features/auth/last-seen";
import { useAuthPresence } from "@/features/auth/use-auth-presence";
import { parseErrorMessage } from "@/features/shared/ui/error-message";
import { gridTableTemplate } from "@/features/shared/ui/grid-table";
import { toaster } from "@/features/shared/ui/toaster";
import { useAuthStore } from "@/stores/auth-store";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

const authStore = useAuthStore();
const confirmStore = useConfirmActionStore();
const queryClient = useQueryClient();
const qrClasses = qrCode({ size: "md" });

useAuthPresence();

const joinCodeQuery = useQuery({
  queryKey: ["auth", "join-code"],
  queryFn: async () => {
    const { data } = await getJoinCode({ client: generatedClient, throwOnError: true });
    return data?.code ?? "";
  },
});

const sessionsQuery = useQuery({
  queryKey: ["auth", "sessions"],
  queryFn: async () => {
    const { data } = await listSessions({ client: generatedClient, throwOnError: true });
    const parsed = v.safeParse(vTgbResolverServerFeaturesAuthSessionsEndpointResponse, data);
    if (!parsed.success) {
      throw new Error("Bad sessions response - retrying may help.");
    }
    return (parsed.output ?? []) as AuthSessionSnapshot[];
  },
});

const magicLink = computed(() => {
  const code = joinCodeQuery.data.value;
  if (!code) return "";
  return `${window.location.origin}/?join=${code}`;
});

const columns = gridTableTemplate([
  { minW: "10rem" },
  { minW: "8rem", maxW: "10rem" },
  { minW: "8rem", maxW: "10rem" },
  { maxW: "5rem" },
]);
const headerRow = cx(gridTableRow(), css({ bg: "bg.subtle", py: "2", fontWeight: "semibold" }));
const bodyRow = gridTableRow();

async function copyLink() {
  if (!magicLink.value) return;
  try {
    await navigator.clipboard.writeText(magicLink.value);
    toaster.create({ title: "Link copied", type: "success" });
  } catch (e) {
    toaster.create({
      title: "Copy failed",
      description: `${parseErrorMessage(e)} Type the code instead.`,
      type: "error",
    });
  }
}

watch(
  () => joinCodeQuery.error.value ?? sessionsQuery.error.value,
  (queryError) => {
    if (queryError) {
      toaster.create({
        title: "Auth data failed to load",
        description: parseErrorMessage(queryError),
        type: "error",
      });
    }
  },
);

const rotateMutation = useMutation({
  mutationFn: async () => {
    const { data } = await rotateJoinCode({ client: generatedClient, throwOnError: true });
    return data?.code ?? "";
  },
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["auth", "join-code"] });
    toaster.create({ title: "Join code rotated", description: "Existing devices stay connected.", type: "success" });
  },
  onError: (error: unknown) => {
    toaster.create({ title: "Rotate failed", description: parseErrorMessage(error), type: "error" });
  },
});

async function rotate() {
  const ok = await confirmStore.confirmAction({
    title: "Rotate join code?",
    message: "Old QR screenshots and links stop working. Connected devices stay online.",
    confirmLabel: "Rotate",
  });
  if (ok) rotateMutation.mutate();
}

const kickMutation = useMutation({
  mutationFn: async (id: string) => {
    await revokeSession({ client: generatedClient, path: { id }, throwOnError: true });
  },
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
  },
  onError: (error: unknown) => {
    toaster.create({ title: "Kick failed", description: parseErrorMessage(error), type: "error" });
  },
});

async function kick(session: AuthSessionSnapshot) {
  const ok = await confirmStore.confirmAction({
    title: `Kick ${session.label}?`,
    message: "The device returns to the Join screen. Everyone else stays connected.",
    confirmLabel: "Kick",
  });
  if (ok) kickMutation.mutate(session.id);
}

</script>

<template>
  <div :class="css({ display: 'flex', flexDirection: 'column', gap: 4, p: 4, overflowY: 'auto' })">
    <div :class="css({ display: 'flex', alignItems: 'center', gap: 4 })">
      <QrCode.Root v-if="magicLink" :value="magicLink" :class="qrClasses.root">
        <QrCode.Frame :class="qrClasses.frame">
          <QrCode.Pattern :class="qrClasses.pattern" />
        </QrCode.Frame>
      </QrCode.Root>
      <code :class="cx(code({ size: 'lg' }), css({ fontSize: 'xl', letterSpacing: '0.2em' }))">
        {{ joinCodeQuery.data.value || "------" }}
      </code>
      <Box :flexGrow="1" />
      <button type="button" :class="button({ variant: 'outline' })" @click="copyLink">
        <Copy :size="16" aria-hidden />
        Copy link
      </button>
      <button type="button" :class="button({ variant: 'outline' })" @click="rotate">
        <RefreshCw :size="16" aria-hidden />
        Rotate
      </button>
    </div>

    <div :class="css({ fontSize: 'sm', color: 'fg.muted' })">
      This device: {{ authStore.label ?? "unknown" }}
      <span v-if="authStore.expirySoon"> - session expires soon, rejoin after the show.</span>
    </div>

    <div :class="headerRow" :style="{ gridTemplateColumns: columns }">
      <div>Device</div>
      <div>Last seen</div>
      <div>Expires</div>
      <div />
    </div>
    <div
      v-for="session in sessionsQuery.data.value ?? []"
      :key="session.id"
      :class="bodyRow"
      :style="{ gridTemplateColumns: columns }"
    >
      <div :class="css({ fontFamily: 'mono' })">{{ session.label }}</div>
      <div>{{ formatLastSeen(session.online, session.lastSeen) }}</div>
      <div>{{ new Date(session.expiresAt).toLocaleString() }}</div>
      <div>
        <button
          type="button"
          :class="button({ variant: 'ghost', size: 'xs' })"
          :disabled="session.id === authStore.sessionId"
          :title="session.id === authStore.sessionId ? 'This device' : `Kick ${session.label}`"
          @click="kick(session)"
        >
          <LogOut :size="16" aria-hidden />
          Kick
        </button>
      </div>
    </div>
  </div>
</template>
