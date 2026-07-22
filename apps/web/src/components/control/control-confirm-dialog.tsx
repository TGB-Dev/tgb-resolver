import { Button, Dialog, Portal } from "@chakra-ui/react";

import { confirmActionModel } from "@/models";

export function ControlConfirmDialog() {
  const open = confirmActionModel.open.value;
  const title = confirmActionModel.title;
  const message = confirmActionModel.message;
  const confirmLabel = confirmActionModel.confirmLabel;
  const cancelLabel = confirmActionModel.cancelLabel;
  const resolveConfirmAction = confirmActionModel.resolveConfirmAction;

  return (
    <Dialog.Root size="sm" open={open} role="alertdialog">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                <>{title}</>
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <>{message}</>
            </Dialog.Body>
            <Dialog.Footer gap="3">
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" onClick={() => resolveConfirmAction(false)}>
                  <>{cancelLabel}</>
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={() => resolveConfirmAction(true)}>
                <>{confirmLabel}</>
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
