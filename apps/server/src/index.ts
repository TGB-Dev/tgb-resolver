import { cors } from "@elysia/cors";
import { node } from "@elysia/node";
import { Elysia } from "elysia";

const app = new Elysia({ adapter: node() })
  .get("/", () => "Hello Elysia")
  .use(
    cors({
      // Accept all, this app has nothing to secure from
      origin: true,
    }),
  )
  .listen(5001, ({ hostname, port }) => {
    console.log(`Elysia is running at ${hostname}:${port}`);
  });

export type App = typeof app;
