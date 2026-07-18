import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { router } from "./router";

// biome-ignore lint/style/noNonNullAssertion: expected here
const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  createRoot(rootElement).render(<RouterProvider router={router} />);
}
