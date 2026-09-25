# Lucent Translate

Self-hostable translation management for software projects. You create
projects and manage their translations in the web app, and your applications
pull live updates through the SDK.

## Layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js app: UI, auth, and the API (Drizzle + Postgres, better-auth) |
| `packages/sdk` | `@lucent-translate/sdk`, the framework-agnostic client for fetching translations |
| `packages/svelte` | `@lucent-translate/svelte`, Svelte 5 / SvelteKit bindings |
| `packages/react` | `@lucent-translate/react`, React / Next.js bindings |
| `packages/nuxt` | `@lucent-translate/nuxt`, Nuxt module |
| `examples/sveltekit` | Example SvelteKit app |
| `examples/nextjs` | Example Next.js App Router app |
| `examples/nuxt` | Example Nuxt app |

## Getting started

```bash
pnpm install
docker compose up -d                     # Postgres on localhost:5437
cp apps/web/.env.example apps/web/.env   # then set BETTER_AUTH_SECRET
pnpm db:migrate
pnpm dev                                 # http://localhost:3000
```

On first visit you're asked to create an account, and that account becomes the
instance **admin**. After that, public sign-up is disabled. Admins add users
under **Users**, or you can set `ALLOW_PUBLIC_SIGNUP=true`.

## Database

The schema lives in `apps/web/src/db/schema/`. After you change it:

```bash
pnpm db:generate   # writes a new SQL migration to apps/web/drizzle/
pnpm db:migrate
```
