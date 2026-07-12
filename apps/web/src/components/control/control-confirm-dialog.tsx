import { Button, Dialog, Portal } from "@chakra-ui/react";

import { useConfirmActionStore } from "@/store/control-confirm-action";

export function ControlConfirmDialog() {
  const { open, title, message, confirmLabel, cancelLabel } = useConfirmActionStore();
  const resolveConfirmAction = useConfirmActionStore((s) => s.resolveConfirmAction);

  return (
    <Dialog.Root size="sm" open={open} role="alertdialog">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{message}</Dialog.Body>
            <Dialog.Footer gap="3">
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" onClick={() => resolveConfirmAction(false)}>
                  {cancelLabel}
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={() => resolveConfirmAction(true)}>
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
