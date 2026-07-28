import { Container } from "@chakra-ui/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { Devtools } from "@/features/shared/app/devtools";
import { AppProvider } from "@/features/shared/app/provider";
import { Toaster } from "@/features/shared/ui/toaster";

import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppProvider>
      <Container fluid px="0" minH="dvh">
        <Outlet />
        <Toaster />
        <Devtools />
      </Container>
    </AppProvider>
  );
}
