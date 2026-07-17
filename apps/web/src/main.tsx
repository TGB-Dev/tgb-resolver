import "preact/debug";

import { RouterProvider } from "@tanstack/react-router";
import { render } from "preact";

import { router } from "./router";

// biome-ignore lint/style/noNonNullAssertion: expected here
const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  render(<RouterProvider router={router} />, rootElement);
}
