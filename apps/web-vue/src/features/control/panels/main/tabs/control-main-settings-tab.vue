<script setup lang="ts">
import {
  createListCollection,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SwitchControl,
  SwitchHiddenInput,
  SwitchLabel,
  SwitchRoot,
  SwitchThumb,
} from "@ark-ui/vue";
import { Box, Stack, VStack } from "@styled-system/jsx";
import { select, swittch } from "@styled-system/recipes";
import { computed } from "vue";

import {
  useControlCanMutate,
  useControlFullAutoEnabled,
  useControlTickRate,
  useUpdateAutomationMutation,
  useUpdateSettingsMutation,
} from "@/features/control/composables/use-show";

defineOptions({ name: "ControlMainSettingsTab" });

const TICK_RATE_OPTIONS = [
  120,
  120 / 1.001,
  100,
  60,
  60 / 1.001,
  50,
  30,
  30 / 1.001,
  25,
  24,
  24 / 1.001,
].map((rate) => ({ value: rate.toString(), label: rate.toFixed(3) }));

const collection = createListCollection({
  items: TICK_RATE_OPTIONS,
});

const canMutate = useControlCanMutate();
const fullAutoEnabled = useControlFullAutoEnabled();
const tickRate = useControlTickRate();
const updateAutomation = useUpdateAutomationMutation();
const updateSettings = useUpdateSettingsMutation();

const activeValue = computed(() => [
  (tickRate.value ?? 60).toString(),
]);

const selectClasses = select();
const switchClasses = swittch({ size: "md" });
</script>

<template>
  <Box h="full" p="4">
    <VStack gap="6" alignItems="stretch">
      <SwitchRoot
        :checked="fullAutoEnabled"
        :disabled="!canMutate || updateAutomation.isPending.value"
        :class="switchClasses.root"
        @checked-change="(details) => updateAutomation.mutate({ fullAutoEnabled: details.checked })"
      >
        <SwitchControl :class="switchClasses.control">
          <SwitchThumb :class="switchClasses.thumb" />
        </SwitchControl>
        <SwitchHiddenInput />
        <SwitchLabel :class="switchClasses.label">Full auto advance</SwitchLabel>
      </SwitchRoot>

      <Stack gap="2">
        <Box fontSize="sm" color="fg.muted">
          Tick rate for server-side timers (crucial for FXs) (fps)
        </Box>

        <SelectRoot
          :collection="collection"
          :model-value="activeValue"
          :disabled="!canMutate || updateSettings.isPending.value"
          :class="selectClasses.root"
          @value-change="(details) => {
            const selected = details.value[0];
            if (selected !== undefined) {
              updateSettings.mutate(Number(selected));
            }
          }"
        >
          <SelectLabel :class="selectClasses.label">Tick rate</SelectLabel>
          <SelectTrigger :class="selectClasses.trigger">
            <SelectValueText :class="selectClasses.valueText" placeholder="Select rate" />
          </SelectTrigger>
          <SelectPositioner :class="selectClasses.positioner">
            <SelectContent :class="selectClasses.content">
              <SelectItem
                v-for="item in collection.items"
                :key="item.value"
                :item="item"
                :class="selectClasses.item"
              >
                <SelectItemText :class="selectClasses.itemText">{{ item.label }}</SelectItemText>
                <SelectItemIndicator :class="selectClasses.itemIndicator">✓</SelectItemIndicator>
              </SelectItem>
            </SelectContent>
          </SelectPositioner>
        </SelectRoot>
      </Stack>
    </VStack>
  </Box>
</template>
