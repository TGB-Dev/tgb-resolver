# tgb-resolver

## Commands

- `pnpm dev` — run all apps in parallel (server + web)
- `pnpm build` — builds through Nx respecting dependency graph
- `pnpm test` — runs all vitest projects + `dotnet test` for .NET
- `pnpm check-types` — `tsc --noEmit` for all TS packages
- `pnpm format` / `pnpm lint` / `pnpm check` — Biome (not ESLint/Prettier)
- `pnpm serve` — run production previews
- `pnpm sync` / `pnpm sync:check` — syncpack dependency consistency
- `pnpm hooks:install` — enable native `.githooks/pre-commit` (one-time)
- `pnpm nx run server:openapi` — regenerate `openapi.yaml` from server

Pre-commit hook runs: `biome check --write --staged` → `sync:check || sync` → `build` → `test`.

## Structure

| Path | Role |
|---|---|
| `apps/server/` | .NET 10 solution (FastEndpoints, SignalR, EF Core Sqlite, NSwag, Mapperly). Solution: `.slnx` format |
| `apps/web/` | TanStack Start SPA (React 19, Vite, Chakra UI 3, Jotai, react-window). Dev port 3000 |
| `packages/contracts/` | OpenAPI-generated TS HTTP client + TanStack Query + Valibot schemas. Generated from `apps/server/.../openapi.yaml` |
| `packages/realtime/` | Client-side clock sync, timeline and domain helpers. Re-exports contracts enums; must not redeclare them |

Workspace packages: `@tgb-resolver/*`.

## Conventions

- **`verbatimModuleSyntax`** enabled root-wide — always use `import type` for type-only imports
- **String-valued enums** for domain vocabularies (not string unions). Contracts owns wire enums; realtime re-exports them
- **Contracts build**: `pnpm run generate` (openapi-ts) → `tsdown`. Depends on current `openapi.yaml`
- **OpenAPI regeneration**: `pnpm nx run server:openapi` (wraps `dotnet build -p:GenerateOpenApiDocument=true`)
- **Biome** (v2.5.1): `recommended` preset, 100 col, 2-space. `organizeImports` grouped: react-scan blank package blank alias blank path. Ignores `*.gen.ts` and `vite.config.ts`
- **syncpack**: explicit pinned versions for typescript/biome/vite; React/TanStack allowed to drift; `@tgb-resolver/*` ignored
- **Env**: `.env` → `VITE_API_URL` (default `http://localhost:5001`). Copy from `.env.example`

## Testing

- **Vitest workspace** covers `packages/*` and `apps/*` (see `vitest.workspace.ts`). All TS packages use `--passWithNoTests`.
- **.NET tests** use TUnit (`[Test]`, not `[Fact]`). Tests are `sealed class` with `await Assert.That(...)`. Run via `dotnet test`, not VSTest.
  - Filter: `dotnet run --project <test.csproj> -- --treenode-filter "/*/*/Class/*"`
  - Two test projects: `TGB.Resolver.Server.Tests` and `TGB.Resolver.IcpcXmlParser.Tests`

## .NET specifics

- Target: `net10.0`, SDK 10.0.301
- Solution format: `.slnx` (new XML-based format), not `.sln`
- Nx server `project.json` at `apps/server/project.json` with targets: `build`, `test`, `dev`, `serve`, `check-types`, `openapi`
- `dotnet-tools.json` at `apps/server/dotnet-tools.json` — ReSharper CLI via `dotnet tool run jb`
- SQLitePCLRaw pinned to 3.0.3 (temp workaround for efcore vulnerability)
- `ExportSwaggerDocsAndExitAsync("v1")` in `Program.cs` generates `openapi.yaml` at startup
- Scalar API reference at `/scalar`, Swagger JSON at `/openapi/{documentName}.json`


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->