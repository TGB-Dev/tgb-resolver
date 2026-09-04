import { watchEffect } from "vue";
import { useRoute } from "vue-router";

import { useShortcutsStore } from "./shortcuts-store";
import { CommandScope } from "./types";

/**
 * Derives the active command scopes from the current route. `Global` is always
 * active; the control page (and its sub-routes) activate the Control, Timeline,
 * Assets, and Extensions scopes, while the leaderboard page activates
 * Leaderboard. Keeps the registry's `scope` field functionally meaningful so
 * feature-scoped hotkeys don't fire app-wide.
 */
export function useRouteScopes(): void {
  const route = useRoute();
  const store = useShortcutsStore();

  watchEffect(() => {
    const path = route.path;
    if (path.startsWith("/control")) {
      store.setActiveScopes([
        CommandScope.Control,
        CommandScope.Timeline,
        CommandScope.Assets,
        CommandScope.Extensions,
      ]);
    } else if (path === "/") {
      store.setActiveScopes([CommandScope.Leaderboard]);
    } else {
      store.setActiveScopes([]);
    }
  });
}
