import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { ErrorPage, NotFoundPage } from "./components/app/error-page";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFoundPage />,
    defaultErrorComponent: ({ error }: { error: Error }) => <ErrorPage error={error} />,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

export const router = getRouter();
