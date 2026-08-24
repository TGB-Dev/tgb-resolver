<script setup lang="ts">
import { Slider, Switch } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { separator, slider, swittch } from "@styled-system/recipes";
import { computed, ref } from "vue";

import {
  useControlAutoResolveEnabled,
  useControlAutoResolveSpeedMs,
  useControlCanMutate,
  useUpdateAutomationMutation,
} from "@/features/control/composables/use-show";

const canMutate = useControlCanMutate();
const autoResolveEnabled = useControlAutoResolveEnabled();
const autoResolveSpeedMs = useControlAutoResolveSpeedMs();
const updateAutomation = useUpdateAutomationMutation();

const SPEED_RATES = [0.2, 0.5, 1, 2, 5];
const dragValue = ref<number[]>([]);
const rateIndex = computed(() => {
  const idx = SPEED_RATES.findIndex((rate) => 3000 / rate <= autoResolveSpeedMs.value);
  return idx >= 0 ? idx : SPEED_RATES.length - 1;
});
const sliderValue = computed(() => (dragValue.value.length > 0 ? dragValue.value : [rateIndex.value]));
const sliderClasses = slider();
const switchClasses = swittch({ size: "sm" });
const separatorClass = separator({ orientation: "vertical", size: "sm" });

function handleSpeedChange(details: { value: number[] }) {
  dragValue.value = details.value;
}

function handleSpeedChangeEnd(details: { value: number[] }) {
  dragValue.value = [];
  const rate = SPEED_RATES[details.value[0] as number];
  if (rate !== undefined) {
    updateAutomation.mutate({ autoResolveSpeedMs: Math.round(3000 / rate) });
  }
}
</script>

<template>
  <div :class="[separatorClass, css({ h: '6', mx: 1 })]" aria-hidden />

  <Switch.Root
    :checked="autoResolveEnabled"
    :disabled="!canMutate || updateAutomation.isPending.value"
    :class="switchClasses.root"
    @checked-change="(details) => updateAutomation.mutate({ autoResolveEnabled: details.checked })"
  >
    <Switch.Label :class="switchClasses.label">Autoplay</Switch.Label>
    <Switch.Control :class="switchClasses.control">
      <Switch.Thumb :class="switchClasses.thumb" />
      <Switch.HiddenInput />
    </Switch.Control>
  </Switch.Root>

  <Slider.Root
    :model-value="sliderValue"
    :min="0"
    :max="4"
    :step="1"
    :disabled="!canMutate || updateAutomation.isPending.value"
    :class="cx(sliderClasses.root, css({ width: '32' }))"
    @value-change="handleSpeedChange"
    @value-change-end="handleSpeedChangeEnd"
  >
    <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4' })">
      <Slider.Control :class="sliderClasses.control">
        <Slider.Track :class="sliderClasses.track">
          <Slider.Range :class="sliderClasses.range" />
        </Slider.Track>
        <Slider.Thumb :index="0" :class="sliderClasses.thumb" />
      </Slider.Control>
      <Slider.ValueText :class="sliderClasses.valueText">{{ SPEED_RATES[rateIndex] }}x</Slider.ValueText>
    </div>
  </Slider.Root>
</template>
