import { Button, Dialog, Field, Input, Portal } from "@chakra-ui/react";

import { confirmActionModel } from "@/features/shared/confirm-action-model";

export function ControlConfirmDialog() {
  const open = confirmActionModel.open.value;
  const showInput = confirmActionModel.showInput.value;
  const title = confirmActionModel.title;
  const message = confirmActionModel.message;
  const confirmLabel = confirmActionModel.confirmLabel;
  const cancelLabel = confirmActionModel.cancelLabel;

  return (
    <Dialog.Root
      size="sm"
      open={open}
      role="alertdialog"
      onEscapeKeyDown={() => confirmActionModel.resolveConfirmAction(false)}
      onInteractOutside={() => confirmActionModel.resolveConfirmAction(false)}
    >
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
              {showInput ? (
                <Field.Root>
                  <Field.Label>
                    <>{message}</>
                  </Field.Label>
                  <Input
                    defaultValue={confirmActionModel.inputValue.value}
                    onChange={(e) => confirmActionModel.setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        confirmActionModel.resolveConfirmAction(true);
                      }
                    }}
                    autoFocus
                  />
                </Field.Root>
              ) : (
                <>{message}</>
              )}
            </Dialog.Body>
            <Dialog.Footer gap="3">
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => confirmActionModel.resolveConfirmAction(false)}
                >
                  <>{cancelLabel}</>
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette={showInput ? "colorPalette" : "red"}
                onClick={() => confirmActionModel.resolveConfirmAction(true)}
              >
                <>{confirmLabel}</>
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
