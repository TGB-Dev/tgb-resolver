export { ExtensionRegistry, extensionRegistry } from "./base/registry";
export type {
  BaseExtension,
  Extension,
  ScriptOnlyExtension,
  WithReactComponentExtension,
} from "./base/types";
export { ExtensionType, getExtensionPayload } from "./base/types";
export {
  ExtensionPayloadValidationError,
  patchExtensionPayload,
  usePatchExtensionPayload,
} from "./patch";
