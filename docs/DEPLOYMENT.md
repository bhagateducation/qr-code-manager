# QR Manager deployment runbook

Status: local foundation tested; no new production deployment has been made. The old static demo is still the last verified live version. Never upload the old root `qr-code-manager-hostinger.zip`.

## Intended public routes

- Website: `https://rosybrown-narwhal-127133.hostingersite.com/`
- Sign in: `https://rosybrown-narwhal-127133.hostingersite.com/login`
- Single panel: `https://rosybrown-narwhal-127133.hostingersite.com/dashboard`
- Dynamic scan: `/s/{shortCode}`
- Health: `/api/health`
- Razorpay webhook: `/api/billing/webhook`

These are planned deployment routes, not confirmed live URLs for the new application. A secret-looking URL is not a security measure. The panel checks a server-side session and every API scopes data by workspace. Platform controls are shown inside the same panel only for a server-provisioned platform administrator.

## Preparation

1. Restore the Hostinger hosting connection. Confirm the website's available Node.js runtime, database and backup capabilities.
2. Back up the current static files. User confirmed the existing data is disposable, but use a separate database for the new schema to make rollback independent.
3. Create a new MySQL database/user scoped to this application. Store a generated unique password privately. Do not reuse or publish the old repository's secrets.
4. Set the full environment set from `.env.example` in hosting. `DATABASE_URL` must use `127.0.0.1:3306` inside Hostinger, not the public remote DB hostname. Set `APP_URL` to the exact HTTPS origin above.
5. Prices are paise: Pro `49900`, Business `149900`. Without valid payment keys/webhook secret, checkout is unavailable and free usage works.
6. Configure Node 22 or 24. Local tests used Node 26; the actual deployment runtime remains to be tested.

## Build and database

Use `npm ci` including development dependencies for the build. Run `npm run db:migrate` against the new database, then `npm run build`. The build generates the MySQL Prisma client and uses Next.js standalone output. Do not reuse the local SQLite-generated client. Do not expose database setup/migration endpoints over HTTP.

If Hostinger supports only a build hook for migrations, configure a separate explicit deployment script (`prisma migrate deploy && prisma generate && next build --webpack`) after verifying database connectivity. Normal `build` intentionally does not modify a database.

For a generic Node host, copy `.next/static` into `.next/standalone/.next/static` and start the generated `server.js`; use the platform's built-in Next adapter on Hostinger. Listen on its supplied `PORT`. Preserve no-store semantics on authenticated/API/resolver responses; never add blanket HTML caching.

Run `node scripts/prepare-release.mjs` to create a clean source directory for Hostinger's deploy tool. The script copies only application/config/schema/bootstrap files, excluding local secrets, test DBs, dependencies, built assets and all legacy HTML/demo JS/ZIP files. Point the Hostinger deploy operation at that directory with type `nodejs`, appType `next`, nodeVersion `22` or `24`, and buildScript `build` after migrations are applied.

## Owner bootstrap

The intended owner is `rahulbhagat7458@gmail.com`. Set a strong temporary `OWNER_INITIAL_PASSWORD` privately and run `node scripts/bootstrap.mjs` once in the server environment after migrations. It creates the platform owner and two labelled sample codes only when that account does not exist. It refuses to promote a pre-existing ordinary account automatically. Never infer owner privileges from the login email alone.

Deliver the temporary credential through a private user-controlled channel. The user changes it in Settings; this revokes existing sessions. Remove `OWNER_INITIAL_PASSWORD` from the hosting environment afterwards. No owner password has yet been generated or deployed by this implementation.

## Razorpay acceptance

Configure test keys first, captured-payment behavior and a webhook secret. Subscribe the exact webhook URL to `payment.captured` and `order.paid`. Verify an actual test checkout plus duplicate/delayed webhooks and provider failures. The application obtains amounts from server configuration, stores the order, validates HMAC, fetches the payment from Razorpay, verifies captured status/amount/currency/order, and atomically grants the plan once.

Current billing is **manual 30-day renewal**, not Razorpay automatic subscriptions. No recurring authorization is created. A different-tier purchase starts a new period without proration. Refunds, invoices, reconciliation of orphaned orders and automatic subscriptions remain pending. Do not enable live payment keys before those business policies and legal pages are ready.

## Final acceptance

Poll deployment until completed or failed. Then check actual page content and `/api/health`, create two disposable customers, verify tenant isolation against MySQL, test real QR scan/target edit/pause, check cookie flags, verify logout/password revocation, test mobile/keyboard UI, confirm all local fonts load, exercise Razorpay test mode, verify old PHP/demo endpoints are gone, and test database backup restore. HTTP 200 or a successful local build alone is not acceptance.

## Rollback and operations

Keep the old static backup and new database separate. To roll back, restore the previous static build and retain the new DB for investigation; do not destructively reverse schema migrations. Schedule expired-session/rate-limit cleanup and scan retention before substantial traffic. `bootstrap.mjs` performs an initial cleanup but is not a scheduler. Monitor health, resolver latency, database growth, failed authentication and payments without logging credentials or raw card data.
