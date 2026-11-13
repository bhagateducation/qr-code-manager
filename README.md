# QR Code Generator

A multi-tenant QR code SaaS: numbered dynamic QR codes with search, bulk actions and a 30-day trash, custom business records with public pages, scan analytics, teams, API keys, webhooks and Razorpay billing. Built with Next.js (App Router), React, TypeScript, Prisma and MySQL.

Each customer signs up into their own account and can add extra **panels** for branches or teams. Exactly one **platform owner** (you) has no limits and runs the business from the same panel: **Clients** (usage, plans, extensions, manual payments, custom limits and storage, notes, suspend, open their panel), **Plans** (prices, limits, features) and **Website** (home page text and sections).

## Run locally

```bash
npm ci
cp .env.example .env   # then fill in DATABASE_URL and APP_URL
npm run db:migrate
npm run dev
```

`APP_URL` must be the exact origin you open in the browser (for example `http://localhost:3000`); write requests from any other origin are refused.

## Checks

| Command | What it covers |
| --- | --- |
| `npm run lint` | TypeScript |
| `npm test` | Validation, payment signatures, QR decode for every colour and correction level |
| `node tests/integration.mjs` | 159 HTTP checks against a running local server: auth, tenant isolation, roles, numbering, search, trash, bulk actions, folders, Book QR, quotas, API keys, two-step sign-in, sessions, billing forgery. Creates disposable accounts, so never point it at production. |

## Structure

| Path | Purpose |
| --- | --- |
| `app/app.css` | The whole design system: white work surface, one brand colour for actions, one fixed hue per module. Dark mode and the four accent themes only redefine tokens. See `DESIGN.md`. |
| `components/Dashboard.tsx` | Panel shell: sidebar, header, New menu, command palette (Ctrl K), mobile tab bar, toasts, confirm dialog. |
| `components/ui.tsx` | Shared types, `api()` helper, modal, theme control, motion presets. |
| `components/Overview.tsx`, `QRCodes.tsx`, `QRStudio.tsx`, `Systems.tsx`, `Analytics.tsx` | Workspace views. `QRCodes.tsx` holds search, filters, bulk actions and the trash. |
| `components/Books.tsx` | Book QR (a code per question, a folder per chapter) and the print sheet. |
| `components/SiteDemo.tsx` | The live QR generator and the destination-swap demo on the home page. |
| `components/Connect.tsx` | Tags, campaigns, webhooks, API keys. |
| `components/Workspace.tsx` | Team, billing, audit log, settings, help, clients (platform owner). |
| `app/api/workspace` | Every workspace read and write, scoped by the signed-in user's workspace. |
| `app/api/platform` | Platform owner: list, suspend and set the plan of client workspaces. |
| `app/s/[code]` | Public scan resolver. Logs the scan, then redirects. Webhooks fire after the response. |
| `app/api/v1/qr` | Public API, authenticated with an `x-api-key` header. |
| `lib/plans.ts` | Plan limits for an account (main panel plus its panels), usage and storage estimate, custom-domain link base. |
| `lib/maintenance.ts` | Renewal reminders and domain health checks, run every 6 hours from panel traffic or on demand. |
| `lib/site.ts` | Editable home-page content with safe defaults. |
| `components/Owner.tsx` | Platform owner: Clients, Plans, Website. |
| `components/Account.tsx` | Panels and custom-domain set-up. |
| `components/FolderPicker.tsx` | Folder tree with search and in-place folder creation. |
| `components/Bulk.tsx` | Many codes at once, YouTube playlist import, Excel/Word/CSV import, folder settings. |
| `lib/office.ts` | Excel and Word export with QR images, import format files and the import reader. |
| `lib/youtube.ts` | Reads a public playlist (official Data API with `YOUTUBE_API_KEY`, otherwise the first 100 videos from the public page). |
| `lib/email.ts`, `lib/secrets.ts` | Email by SMTP or Resend, configurable from the panel; panel-saved secrets are encrypted. |
| `app/q/[code]` | Share page that shows a code's QR image, and the friendly page for paused or link-less codes. |
| `lib/brand.ts` | Product name and support email, set with `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_SUPPORT_EMAIL`. |

## Roles

| Role | Can do |
| --- | --- |
| Owner | Everything, including billing, team and workspace settings |
| Admin | Content, plus API keys, webhooks and permanent deletion |
| Editor | Create and edit codes, systems, records, tags and campaigns; move codes to the trash and restore them |
| Viewer | View and download only |

## Before you sell it

These need your own accounts or decisions and are not done by the code:

1. A MySQL database and the environment values in `.env.example`.
2. Razorpay keys and webhook secret, entered under **Configuration** in the panel (or as environment values). Until they are set, checkout is off and plans can only be granted from the Clients panel.
3. Email settings under **Configuration** (Hostinger SMTP or Resend) so reminders, receipts, sign-in codes and invitations are delivered. Without them, invitation links are shown to the owner to copy.
4. Terms, privacy and refund pages.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/USER-GUIDE.md](docs/USER-GUIDE.md).
