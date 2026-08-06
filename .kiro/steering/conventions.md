# Code Conventions

## File naming
- `src/lib/` — kebab-case, one concern per file (e.g. `review-sync.ts`, `token-encryption.ts`)
- `src/app/(protected)/[feature]/actions.ts` — server actions for that page
- `src/app/(protected)/[feature]/page.tsx` — server component, fetches data, passes to client components
- `src/components/[feature]-[role].tsx` — client components (e.g. `review-service-manager.tsx`)

## TypeScript
- Strict mode on. No `any` — use `unknown` and narrow explicitly
- Prefer `Record<string, unknown>` over `object` for JSONB fields
- Export types alongside functions in the same file — no separate `types/` directory
- Guard functions pattern: `function asRecord(v: unknown): Record<string, unknown>`

## Prisma / DB
- Always use `select:` to limit fields — never fetch full rows when partial suffices
- UUID primary keys: `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- Timestamps: always `@db.Timestamptz(6)`, default `now()`
- JSONB fields: type as `Json` in schema, cast with `as Prisma.InputJsonValue` on write
- Multi-step writes: wrap in `prisma.$transaction()` for consistency

## Error handling
- Server actions: catch specific Prisma error codes (e.g. `P2002` = unique violation)
- API routes: always return `NextResponse.json({ error: "..." }, { status: NNN })`
- Never expose internal error messages to external callers
- Async fire-and-forget: `.catch(() => {/* non-blocking */})`

## Security (non-negotiable)
- Every new server action must call `requireSession()` or inline session check first
- New API routes that need auth must check session — middleware does NOT cover `/api/*`
- New `provider_connections.token_data` writes must use `encryptTokenData()`
- New `provider_connections.token_data` reads must use `decryptTokenData()`
- New audit-worthy events (auth, data mutations, integrations) must write to `audit_events`
- New public-facing endpoints must have rate limiting via `src/lib/rate-limit.ts`

## Environment variables
- All secrets via env vars — never hardcode
- New secrets: add to `.env.production.example`, `pipeline.yml` (env + envs + merge_env_var), and document in `DEPLOYMENT.md`
- Security-critical vars: `TOKEN_ENCRYPTION_KEY`, `HEALTH_CHECK_TOKEN`, `VYNTRISE_WEBHOOK_SECRET`

## Component patterns
- Page components are async server components — fetch data, pass as props
- Client components use `"use client"` directive and receive typed props
- Toast notifications via `src/lib/toast.ts` wrapper (sonner)
- Error/success state via URL search params, handled in `useEffect` with `useSearchParams()`

## Adding a new feature
1. Add DB migration in `db/migrations/NNN_name.sql`
2. Update `prisma/schema.prisma` to match
3. Add server actions in `src/app/(protected)/[feature]/actions.ts`
4. Add page in `src/app/(protected)/[feature]/page.tsx`
5. Add UI components in `src/components/`
6. Gate behind entitlement check if plan-restricted
7. Add audit events for any sensitive mutations
