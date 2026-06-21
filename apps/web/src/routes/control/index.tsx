import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/control/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/control/"!</div>;
}
