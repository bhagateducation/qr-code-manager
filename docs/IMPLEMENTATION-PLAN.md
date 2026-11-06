# QR Manager implementation plan

Confirmed: public SaaS, brand QR Manager, Razorpay, existing data is disposable demo data. Retain only a few explicitly labelled examples. One application panel at `/dashboard`; owner controls live in that panel and require a server-side platform role.

## Architecture
Next.js App Router (React), TypeScript, Prisma and Hostinger MySQL. Server-authorized API routes, opaque database sessions in HttpOnly cookies, workspace filters on every business query. No localStorage authentication. No database maintenance endpoints in the public application. Dynamic QR resolver at `/s/[code]`.

## Sequence
1. Inventory and evidence-based audit of existing source and live deployment.
2. Persistent authentication, workspaces, QR management, systems/records, resolver and scan reporting.
3. One responsive dashboard, actual exports, settings and owner administration.
4. Razorpay server-created orders, signature validation, captured-payment verification and replay-safe plan entitlement. Checkout remains unavailable without configured credentials/pricing.
5. Regression checks, tenant isolation tests, build, browser review, production migration/deployment and live verification.

## Design direction
Preserve the existing purple identity: brand #5B43D6, ink #17161D, muted #666371, canvas #F5F4F7, surface #FEFDFE, border #E4E1E8. Use locally served Roboto Slab for headings and Poppins for body, forms and controls, 14px controls and 16px body copy; 32–52px public headings. Left-aligned compact panel, persistent navigation, wide data table and an adjacent QR editor/preview. Rounded 12px controls, 18px panels, 160–220ms user-triggered transitions, visible focus, reduced-motion support. Product-specific focal point: a real downloadable QR beside its destination and scan activity. Avoid decorative 3D rendering in the authenticated working panel.

## Required launch decisions/configuration
Confirmed owner: rahulbhagat7458@gmail.com. Domain: rosybrown-narwhal-127133.hostingersite.com. Pricing: Free / Pro INR 499 / Business INR 1499. Still required: Razorpay test/live credentials and webhook secret, transactional email provider, support/business details and approved legal policies. Do not label absent integrations or demo results as working.

## Launch gates
Correct credentials required; logout invalidates sessions; tenant B cannot read/edit tenant A records; unauthenticated writes denied; invalid/cross-origin requests rejected; QR target updates retain printed link; paused/missing codes do not redirect; PNG decodes to expected payload and SVG contains vector paths; payments cannot be spoofed/replayed; build succeeds; mobile keyboard navigation works; live database and deployment verified. External payment/email delivery and backup restore require separate end-to-end evidence.

