import { RouterProvider } from "@tanstack/react-router";
import { generatedClient } from "@tgb-resolver/contracts";
import { createRoot } from "react-dom/client";

import { router } from "./router";

generatedClient.setConfig({
  baseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5001",
});

// biome-ignore lint/style/noNonNullAssertion: expected here
const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  createRoot(rootElement).render(<RouterProvider router={router} />);
}
