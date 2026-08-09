import { Box, Select, Stack, Switch, Text, useListCollection } from "@chakra-ui/react";

import {
  useControlCanMutate,
  useControlFullAutoEnabled,
  useControlTickRate,
  useUpdateAutomationMutation,
  useUpdateSettingsMutation,
} from "@/features/control/hooks";

const TICK_RATE_OPTIONS: { value: number; label: string }[] = [
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
].map((rate) => ({ value: rate, label: rate.toFixed(3) }));

export function ControlMainSettingsTab() {
  const canMutate = useControlCanMutate();
  const fullAutoEnabled = useControlFullAutoEnabled();
  const tickRate = useControlTickRate();
  const updateAutomation = useUpdateAutomationMutation();
  const updateSettings = useUpdateSettingsMutation();
  const { collection } = useListCollection({ initialItems: TICK_RATE_OPTIONS });
  const activeValue = tickRate ?? 60;
  const active = TICK_RATE_OPTIONS.find((option) => option.value === activeValue);
  const displayValue = active ? [active.value.toString()] : [];

  return (
    <Box boxSize="full" p={4}>
      <Stack gap={4}>
        <Switch.Root
          checked={fullAutoEnabled}
          onCheckedChange={({ checked }) => updateAutomation.mutate({ fullAutoEnabled: checked })}
          disabled={!canMutate || updateAutomation.isPending}
        >
          <Switch.Label>Full auto advance</Switch.Label>
          <Switch.Control>
            <Switch.Thumb />
            <Switch.HiddenInput />
          </Switch.Control>
        </Switch.Root>

        <Stack gap={1}>
          <Text textStyle="sm">Tick rate for server-side timers (crucial for FXs) (fps)</Text>
          <Select.Root
            collection={collection}
            value={displayValue}
            disabled={!canMutate || updateSettings.isPending}
            onValueChange={(details) => {
              const selected = details.value[0];
              if (selected !== undefined) {
                updateSettings.mutate(Number(selected));
              }
            }}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText>{active ? active.label : "60"}</Select.ValueText>
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {collection.items.map((option) => (
                  <Select.Item item={option} key={option.value}>
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Stack>
      </Stack>
    </Box>
  );
}
