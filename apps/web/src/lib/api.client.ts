import { treaty } from "@elysia/eden";
import type { App } from "@tgb-resolver/server";

export const apiClient = treaty<App>(import.meta.env.VITE_API_URL || "http://localhost:5001");
