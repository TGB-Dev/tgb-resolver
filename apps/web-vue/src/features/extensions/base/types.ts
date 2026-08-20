import type { RuntimeFormDefinition } from "@tgb-form/core";
import type { TimelineEvent, TimelineTableItem } from "@tgb-resolver/realtime";
import { TimelineEventType } from "@tgb-resolver/realtime";
import type { Component, VNode } from "vue";

export interface BaseExtension {
  readonly extId: string;
  readonly shortName: string;
  readonly description: string;
  readonly configForm?: RuntimeFormDefinition;
  formatCueMessage(event: TimelineTableItem): VNode;
}
export enum ExtensionType {
  ScriptOnly,
  WithVueComponent,
}
export interface WithVueComponentExtension<TPayload = unknown> extends BaseExtension {
  readonly type: ExtensionType.WithVueComponent;
  component: Component<{ payload: TPayload }>;
  earlyDestruction?: () => void;
}
export interface ScriptOnlyExtension extends BaseExtension {
  readonly type: ExtensionType.ScriptOnly;
  execute(payload: Record<string, unknown>): () => void | Promise<void>;
}
export type Extension = WithVueComponentExtension<any> | ScriptOnlyExtension;
export function getExtensionPayload<TConfig extends Record<string, unknown>>(
  event: TimelineEvent | TimelineTableItem,
): TConfig | undefined {
  if (event.type !== TimelineEventType.CUS) return undefined;
  if ("extPayload" in event && event.extPayload !== undefined) return event.extPayload as TConfig;
  if ("payload" in event && event.payload && "extPayload" in event.payload)
    return event.payload.extPayload as TConfig;
  return undefined;
}
