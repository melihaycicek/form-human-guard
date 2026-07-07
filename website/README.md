# form-human-guard — website

Marketing + docs site for the [`form-human-guard`](https://www.npmjs.com/package/form-human-guard) npm package. Next.js 16 (App Router, Turbopack), Tailwind CSS v4, next-intl (en / zh-CN / es / hi), next-themes, MDX docs, live demos backed by real Route Handlers.

The site **dogfoods the package**: the visible demo, the invisible SubmitGuard demo, the newsletter form, and the Exclusive waitlist all run through real challenge → verify → one-time-token flows against `/api/guard/*`.

## Local development

```bash
npm install
npm run dev
```

No env vars needed locally — the guard API falls back to an in-process `MemoryStore` and a dev-only signing secret. Everything works in `next dev` (single process).

## Package dependency (vendored tarball)

npm currently has `form-human-guard@0.1.0`, but this site needs v0.2 (`SubmitGuard`, direction-match, risk scoring). Until 0.2 is published, the dependency is a **vendored tarball** committed at `vendor/form-human-guard-0.2.0.tgz`:

```json
"form-human-guard": "file:./vendor/form-human-guard-0.2.0.tgz"
```

This ships with the repo, so it resolves fine on Vercel. **After publishing 0.2.0 to npm**, switch to `"form-human-guard": "^0.2.0"` and delete `vendor/`. To refresh the tarball: `npm run build && npm pack` in the package repo, copy the `.tgz` here, and `npm install`.

## Environment variables (production)

| Variable | Required | Purpose |
| --- | --- | --- |
| `GUARD_SECRET` | yes | HMAC signing secret for guard tokens (long random string) |
| `UPSTASH_REDIS_REST_URL` | yes | Upstash Redis REST endpoint — shared store for challenges/tokens |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Upstash Redis REST token |
| `ADMIN_KEY` | optional | Enables `GET /api/waitlist/stats?key=…` (signup counts per tier) |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical origin for metadata/sitemap/hreflang |

See `.env.example`. **Why Redis is required:** Route Handlers on Vercel run as multiple serverless instances with no shared memory; a challenge created on one instance can't be verified on another. `MemoryStore` is dev-only. Without the Upstash vars in production, the demo API answers `503 DEMO_STORE_UNAVAILABLE` instead of failing mysteriously.

## Deploying to Vercel

1. Import the repository and set **Root Directory = `website/`** (Framework preset: Next.js — build/output defaults are fine).
2. Create an [Upstash Redis](https://upstash.com) database and add the two REST env vars.
3. Add `GUARD_SECRET` (and optionally `ADMIN_KEY`, `NEXT_PUBLIC_SITE_URL`).
4. Deploy. Smoke-check: solve both demos, watch the "reuse token" button return 401, subscribe to the newsletter, join the waitlist.

## Architecture notes

- `src/lib/guard-store.ts` — environment-detecting store factory (Upstash `RedisStore` in prod, `MemoryStore` in dev) with the ioredis↔Upstash client adapter.
- `src/app/api/guard/[action]/…` — challenge/verify routes per action (`demo`, `newsletter`, `waitlist`), so tokens are action-bound; `/api/demo/submit` is the demo's protected endpoint that consumes tokens.
- Rate limiting via `@upstash/ratelimit` (in-memory fallback in dev).
- Docs are MDX in `content/docs/en/`, statically generated; per-locale folders (`content/docs/<locale>/`) can be added later without route changes.
- Locales live in one array in `src/i18n/routing.ts`; adding one is that line + a `messages/<locale>.json`.
- v1 intentionally ships **no** analytics, payments, auth, or CMS. The cookie banner gates nothing yet (`useConsent()` is ready for a future analytics script).
