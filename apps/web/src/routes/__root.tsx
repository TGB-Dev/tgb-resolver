import { Container } from "@chakra-ui/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { AppProvider } from "@/components/app/provider";
import { Toaster } from "@/components/ui/toaster";

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
      </Container>
    </AppProvider>
  );
}
