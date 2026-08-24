<script setup lang="ts">
import { createListCollection, Select, Switch } from "@ark-ui/vue";
import { Check, ChevronDown, X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { select, swittch } from "@styled-system/recipes";
import { computed } from "vue";

import {
  useControlCanMutate,
  useControlFullAutoEnabled,
  useControlTickRate,
  useUpdateAutomationMutation,
  useUpdateSettingsMutation,
} from "@/features/control/composables/use-show";

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

const activeValue = computed(() => [(tickRate.value ?? 60).toString()]);

const selectClasses = select();
const switchClasses = swittch({ size: "md" });
</script>

<template>
  <div :class="css({ boxSize: 'full', p: '4' })">
    <div
      :class="css({ display: 'flex', flexDirection: 'column', gap: '4', alignItems: 'stretch' })"
    >
      <Switch.Root
        :checked="fullAutoEnabled"
        :disabled="!canMutate || updateAutomation.isPending.value"
        :class="switchClasses.root"
        @checked-change="(details) => updateAutomation.mutate({ fullAutoEnabled: details.checked })"
      >
        <Switch.Control :class="switchClasses.control">
          <Switch.Thumb :class="switchClasses.thumb" />
        </Switch.Control>
        <Switch.HiddenInput />
        <Switch.Label :class="switchClasses.label">Full auto advance</Switch.Label>
      </Switch.Root>

      <div :class="css({ display: 'flex', flexDirection: 'column', gap: '1' })">
        <div :class="css({ fontSize: 'sm' })">
          Tick rate for server-side timers (crucial for FXs) (fps)
        </div>

        <Select.Root
          :collection="collection"
          :model-value="activeValue"
          :disabled="!canMutate || updateSettings.isPending.value"
          :positioning="{ sameWidth: true }"
          :class="cx(selectClasses.root, css({ w: 'full' }))"
          @value-change="
            (details) => {
              const selected = details.value[0];
              if (selected !== undefined) {
                updateSettings.mutate(Number(selected));
              }
            }
          "
        >
          <Select.Label :class="selectClasses.label">Tick rate</Select.Label>
          <Select.Control :class="selectClasses.control">
            <Select.Trigger :class="selectClasses.trigger">
              <Select.ValueText :class="selectClasses.valueText" placeholder="Select rate" />
            </Select.Trigger>
            <div :class="selectClasses.indicatorGroup">
              <Select.ClearTrigger :class="selectClasses.clearTrigger">
                <X :size="16" aria-hidden="true" />
              </Select.ClearTrigger>
              <Select.Indicator :class="selectClasses.indicator">
                <ChevronDown aria-hidden="true" />
              </Select.Indicator>
            </div>
          </Select.Control>
          <Select.Positioner :class="selectClasses.positioner">
            <Select.Content :class="selectClasses.content">
              <Select.Item
                v-for="item in collection.items"
                :key="item.value"
                :item="item"
                :class="selectClasses.item"
              >
                <Select.ItemText :class="selectClasses.itemText">{{ item.label }}</Select.ItemText>
                <Select.ItemIndicator :class="selectClasses.itemIndicator">
                  <Check />
                </Select.ItemIndicator>
              </Select.Item>
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </div>
    </div>
  </div>
</template>
