import { Box, Stack, Switch } from "@chakra-ui/react";

import {
  useControlCanMutate,
  useControlFullAutoEnabled,
  useUpdateAutomationMutation,
} from "@/features/control/hooks";

export function ControlMainSettingsTab() {
  const canMutate = useControlCanMutate();
  const fullAutoEnabled = useControlFullAutoEnabled();
  const updateAutomation = useUpdateAutomationMutation();

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
      </Stack>
    </Box>
  );
}
