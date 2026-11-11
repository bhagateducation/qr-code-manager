# QR Manager deployment runbook

Status: version 2.1.0 (branch `claude/redesign-commercial`) is live on the temporary Hostinger origin below, and Hostinger rebuilds it on every push to that branch. Keep the original static demo backup separate and never upload the old root `qr-code-manager-hostinger.zip`.

## Intended public routes

- Website: `https://violet-gerbil-897016.hostingersite.com/`
- Sign in: `https://violet-gerbil-897016.hostingersite.com/login`
- Single panel: `https://violet-gerbil-897016.hostingersite.com/dashboard`
- Dynamic scan: `/s/{shortCode}`
- Public record: `/p/{publicToken}` (only records explicitly published by a workspace user)
- Health: `/api/health`
- Razorpay webhook: `/api/billing/webhook`

The temporary Hostinger origin is confirmed live; attach the final custom domain only after DNS and TLS are configured. A secret-looking URL is not a security measure. The panel checks a server-side session and every API scopes data by workspace. Platform controls are shown inside the same panel only for a server-provisioned platform administrator.

## Preparation

1. Restore the Hostinger hosting connection. Confirm the website's available Node.js runtime, database and backup capabilities.
2. Back up the current static files. User confirmed the existing data is disposable, but use a separate database for the new schema to make rollback independent.
3. Create a new MySQL database/user scoped to this application. Store a generated unique password privately. Do not reuse or publish the old repository's secrets.
4. Set the full environment set from `.env.example` in hosting. `DATABASE_URL` must use `127.0.0.1:3306` inside Hostinger, not the public remote DB hostname. Set `APP_URL` to the exact HTTPS origin above.
5. Password recovery is available at `/forgot-password` and `/reset-password`; email verification is available at `/verify-email`. Public record pages are private by default and require an explicit Publish action. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as private Hostinger environment variables to deliver both email types. Set `REQUIRE_EMAIL_VERIFICATION=true` only after delivery is verified. Without the provider, the app keeps a privacy-safe generic response but no email is delivered.
6. Prices are paise: Pro `49900`, Business `149900`. Without valid payment keys/webhook secret, checkout is unavailable and free usage works.
7. Configure Node 22 or 24. Local tests used Node 26; the deployed Hostinger build has passed its production build step.

## Build and database

Use `npm ci` including development dependencies for the build. `npm run build` generates the MySQL Prisma client, applies pending migrations (`prisma migrate deploy`) and produces Next.js standalone output, so the database must be reachable during the build. Do not reuse the local SQLite-generated client. Do not expose database setup/migration endpoints over HTTP.

For a generic Node host, copy `.next/static` into `.next/standalone/.next/static` and start the generated `server.js`; use the platform's built-in Next adapter on Hostinger. Listen on its supplied `PORT`. Preserve no-store semantics on authenticated/API/resolver responses; never add blanket HTML caching.

Run `npm run release` to create a clean source directory at `release/qr-manager` for Hostinger's deploy tool. The script copies only application/config/schema/bootstrap files, excluding local secrets, test databases, dependencies, tests and built assets. Point the Hostinger deploy operation at that directory with type `nodejs`, appType `next`, nodeVersion `22` or `24`, and buildScript `build`.

## Upgrading an existing database

Migration `202611100001_numbering_trash` adds QR numbers and the trash. It numbers existing codes in creation order with a window function, so it needs MySQL 8 or MariaDB 10.2 or newer. It was applied successfully to the live Hostinger MySQL database on 2026-11-10. On any other existing database, back up before the first build that applies it.

## Platform owner without a shell

On hosting with no shell (such as Hostinger), set `OWNER_EMAIL` and `OWNER_INITIAL_PASSWORD` in the environment, rebuild, then register at `/register` with that email and that exact password. The account becomes the platform owner; change the password in Settings and remove `OWNER_INITIAL_PASSWORD`. If an owner account with `OWNER_EMAIL` already existed before this version, it becomes the platform owner the next time it opens the panel. The platform owner's own workspace is always on the Business plan.

## Owner bootstrap

The intended owner is `rahulbhagat7458@gmail.com`. Set a strong temporary `OWNER_INITIAL_PASSWORD` privately and run `node scripts/bootstrap.mjs` once in the server environment after migrations. It creates the platform owner and two labelled sample codes only when that account does not exist. It refuses to promote a pre-existing ordinary account automatically. Never infer owner privileges from the login email alone.

Deliver the temporary credential through a private user-controlled channel. The user changes it in Settings; this revokes existing sessions. Remove `OWNER_INITIAL_PASSWORD` from the hosting environment afterwards. No owner password has yet been generated or deployed by this implementation.

## Razorpay acceptance

Configure test keys first, captured-payment behavior and a webhook secret. Subscribe the exact webhook URL to `payment.captured` and `order.paid`. Verify an actual test checkout plus duplicate/delayed webhooks and provider failures. The application obtains amounts from server configuration, stores the order, validates HMAC, fetches the payment from Razorpay, verifies captured status/amount/currency/order, and atomically grants the plan once.

Current billing is **manual 30-day renewal**, not Razorpay automatic subscriptions. No recurring authorization is created. A different-tier purchase starts a new period without proration. Refunds, invoices, reconciliation of orphaned orders and automatic subscriptions remain pending. Do not enable live payment keys before those business policies and legal pages are ready.

## Final acceptance

Poll deployment until completed or failed. Then check actual page content and `/api/health`, create two disposable customers, verify tenant isolation against MySQL, test real QR scan/target edit/pause, check cookie flags, verify logout/password revocation, test mobile/keyboard UI, exercise Razorpay test mode, and test database backup restore. HTTP 200 or a successful local build alone is not acceptance.

## Rollback and operations

Keep the old static backup and new database separate. To roll back, restore the previous static build and retain the new DB for investigation; do not destructively reverse schema migrations. Schedule expired-session/rate-limit cleanup and scan retention before substantial traffic. `bootstrap.mjs` performs an initial cleanup but is not a scheduler. Monitor health, resolver latency, database growth, failed authentication and payments without logging credentials or raw card data.
