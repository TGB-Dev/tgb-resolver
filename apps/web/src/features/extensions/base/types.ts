import type { RuntimeFormDefinition } from "@tgb-form/core";
import type { TimelineEvent, TimelineTableItem } from "@tgb-resolver/realtime";
import { TimelineEventType } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";

export interface BaseExtension {
  // Metadata

  /**
   * Extension identifier for use in show files
   */
  readonly extId: string;

  /**
   * Extension short name for displaying in the event timeline
   */
  readonly shortName: string;

  /**
   * Extension description for displaying in the event timeline
   */
  readonly description: string;

  /**
   * TGB Form definition rendering the extension config UI and (via toValibotSchema)
   * validating extPayload patches before they reach the server.
   * Field names map 1:1 onto CustomEvent.payload.extPayload keys.
   */
  readonly configForm?: RuntimeFormDefinition;

  // Functions

  /**
   * Format the cue message from timeline event for displaying in the cue tab
   * of the control panel.
   */
  formatCueMessage(event: TimelineTableItem): ReactNode;
}

/**
 * TGB Resolver extension type, for defining on how to load the extension in the audience view
 */
export enum ExtensionType {
  ScriptOnly,
  WithReactComponent,
}

// biome-ignore lint/suspicious/noExplicitAny: default payload type
export interface WithReactComponentExtension<TPayload = any> extends BaseExtension {
  readonly type: ExtensionType.WithReactComponent;

  /**
   * The component to be rendered in the audience view. Should have relative position to the whole audience view.
   */
  component: (props: { payload: TPayload }) => ReactNode;

  /**
   * Early destruction hook (will be called when the timeline is seeked). For additional cleaning up if needed.
   * By default, the extension system will unmount the component.
   */
  earlyDestruction?: () => void;
}

export interface ScriptOnlyExtension extends BaseExtension {
  readonly type: ExtensionType.ScriptOnly;

  // TODO: should this be async?
  /**
   * Function to execute. Need to return a cleanup function to be called when the timeline is seeked.
   */
  execute(): () => void | Promise<void>;
}

// biome-ignore lint/suspicious/noExplicitAny: heterogenous extension list
export type Extension = WithReactComponentExtension<any> | ScriptOnlyExtension;

/**
 * Type-safe read of a CUS event's extPayload; undefined for non-CUS events.
 */
export function getExtensionPayload<TConfig extends Record<string, unknown>>(
  event: TimelineEvent | TimelineTableItem,
): TConfig | undefined {
  if (event.type !== TimelineEventType.CUS) return undefined;
  if ("extPayload" in event && event.extPayload !== undefined) {
    return event.extPayload as TConfig | undefined;
  }
  if ("payload" in event && event.payload && "extPayload" in event.payload) {
    return event.payload.extPayload as TConfig | undefined;
  }
  return undefined;
}
