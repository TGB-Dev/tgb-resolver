import { afterEach, describe, expect, test, vi } from "vitest";

import { confirmActionModel } from "@/features/shared/confirm-action-model";

import { floatingPanelModel } from "./floating-panel-model";
import { FloatingPanelType } from "./floating-panel-types";

const reset = () => {
  for (const panel of floatingPanelModel.panels.value) {
    floatingPanelModel.closeFloatingPanel(panel, false);
  }
};

afterEach(() => {
  reset();
  vi.restoreAllMocks();
});

describe("floatingPanelModel", () => {
  test("openFloatingPanel appends handles; panels coexist", () => {
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A");
    const b = floatingPanelModel.openFloatingPanel(FloatingPanelType.ImportShow, "B");

    expect(floatingPanelModel.panels.value).toHaveLength(2);
    expect(a.id).not.toBe(b.id);
    expect(floatingPanelModel.panels.value).toContain(a);
    expect(floatingPanelModel.panels.value).toContain(b);
  });

  test("per-panel dirty state is independent", () => {
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A");
    const b = floatingPanelModel.openFloatingPanel(FloatingPanelType.ImportShow, "B");

    a.setDirty(true);

    expect(a.isDirty.value).toBe(true);
    expect(b.isDirty.value).toBe(false);
    expect(floatingPanelModel.hasDirtyPanels.value).toBe(true);
  });

  test("closeFloatingPanel resolves only that handle's result", async () => {
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A");
    const b = floatingPanelModel.openFloatingPanel(FloatingPanelType.ImportShow, "B");
    const aResult = vi.fn();
    const bResult = vi.fn();
    void a.result.then(aResult);
    void b.result.then(bResult);

    floatingPanelModel.closeFloatingPanel(a, true);

    await Promise.resolve();
    expect(aResult).toHaveBeenCalledWith(true);
    expect(bResult).not.toHaveBeenCalled();
    expect(floatingPanelModel.panels.value).toEqual([b]);
  });

  test("requestClose on clean panel closes without confirm", async () => {
    const confirmSpy = vi.spyOn(confirmActionModel, "confirmAction");
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A");

    const accepted = await floatingPanelModel.requestFloatingPanelClose(a);

    expect(accepted).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(floatingPanelModel.panels.value).toEqual([]);
  });

  test("requestClose on dirty panel declines until confirm accepted", async () => {
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A");
    a.setDirty(true);
    const confirmSpy = vi.spyOn(confirmActionModel, "confirmAction");

    confirmSpy.mockResolvedValueOnce(false);
    expect(await floatingPanelModel.requestFloatingPanelClose(a)).toBe(false);
    expect(floatingPanelModel.panels.value).toContain(a);

    confirmSpy.mockResolvedValueOnce(true);
    expect(await floatingPanelModel.requestFloatingPanelClose(a)).toBe(true);
    expect(floatingPanelModel.panels.value).toEqual([]);
  });

  test("concurrent dirty closes are serialized through the shared confirm dialog", async () => {
    const confirmSpy = vi.spyOn(confirmActionModel, "confirmAction");
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A");
    const b = floatingPanelModel.openFloatingPanel(FloatingPanelType.ImportShow, "B");
    a.setDirty(true);
    b.setDirty(true);

    confirmSpy.mockResolvedValue(true);

    await Promise.all([
      floatingPanelModel.requestFloatingPanelClose(a),
      floatingPanelModel.requestFloatingPanelClose(b),
    ]);

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(floatingPanelModel.panels.value).toEqual([]);
  });

  test("setTitle and setProps signals are exposed on the handle", () => {
    const a = floatingPanelModel.openFloatingPanel(FloatingPanelType.InspectShow, "A", { foo: 1 });

    a.setTitle("Renamed");

    expect(a.title.value).toBe("Renamed");
    expect(a.props.value).toEqual({ foo: 1 });
    expect(a.result).toBeInstanceOf(Promise);
  });
});
