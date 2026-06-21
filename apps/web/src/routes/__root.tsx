import { Container } from "@chakra-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import AppDevtools from "@/components/app/devtools";
import AppProvider from "@/components/app/provider";
import { Toaster } from "@/components/ui/toaster";
import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TGB Resolver",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProvider>
          <Container fluid px="0" minH="dvh">
            {children}
            <Toaster />
            <AppDevtools />
          </Container>
        </AppProvider>
        {import.meta.env.DEV && (
          <script crossOrigin="anonymous" src="https://unpkg.com/react-scan/dist/auto.global" />
        )}
        <Scripts />
      </body>
    </html>
  );
}
