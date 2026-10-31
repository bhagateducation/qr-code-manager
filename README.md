# QR Manager

Next.js / React / TypeScript foundation for a public QR SaaS, using Prisma and MySQL. One authenticated panel at `/dashboard`, with separate server-side platform-owner permissions. Roboto Slab headings and Poppins body/UI fonts are served locally.

**Status:** working local foundation, not yet a fully commercial-ready or live-verified release. The original root HTML/JS/ZIP and `components/dashboard`/`components/ui` are legacy demo references. They are not imported by the new application and are excluded from the clean release directory. Never deploy the old static ZIP.

## Documents

- [Audit, evidence and pending features](docs/AUDIT-2026-10-31.md)
- [Source inventory](docs/BASELINE-INVENTORY.csv)
- [Deployment and owner bootstrap](docs/DEPLOYMENT.md)
- [How each implemented feature works](docs/USER-GUIDE.md)
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)

## Run

Install with `npm ci`. Create a private `.env` based on `.env.example` using a dedicated MySQL database. Run `npm run db:migrate`, `npm run db:generate`, then `npm run dev`. Never commit credentials. `npm run build` generates the MySQL client and a Next.js standalone build; it deliberately does not run migrations.

## Checks

- `npm test`: validation, payment-signature and QR decode/vector tests.
- `npm run lint`: TypeScript.
- `node tests/integration.mjs`: local HTTP acceptance suite; creates disposable test workspaces. Requires a running locally configured app and test database.
- `npm audit`: dependency advisories.
- `node scripts/prepare-release.mjs`: writes a clean source directory under `release/`, excluding secrets, tests, demo files, build output and dependencies.

Do not point the integration suite at production. Local tests used SQLite with the same Prisma model; the production schema is MySQL and still needs live acceptance.

## Implementation structure

`app/api/auth` and `lib/auth.ts`: credential verification and revocable sessions. `app/api/workspace`: scoped QR/system/record writes with quota enforcement. `app/s/[code]`: public resolver and scan events. `app/api/billing`: Razorpay order/signature/captured-payment handling. `app/api/platform`: owner workspace controls. `components/Dashboard.tsx`, `QRStudio.tsx`, `Systems.tsx`: unified working panel. `prisma/migrations`: initial MySQL schema.

Paid plans are Pro ₹499 and Business ₹1,499 for 30 days with manual renewal. Razorpay must be configured and tested before activation. Password recovery, email verification and MFA are implemented; provider configuration, legal pages and operational launch gates remain documented in the audit.
