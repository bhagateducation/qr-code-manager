# Product

**QR Manager** is a multi-tenant SaaS for businesses that print QR codes on real things: menus, packaging, labels, tickets, business cards.

## Who uses it
- **Workspace owner / staff** of a small or mid-size business. They create codes, print them, and later need to change where a code leads, find one code among thousands, and see whether it is being scanned. Often on a phone, between other tasks.
- **Platform owner** (the reseller). Sells workspaces to clients, grants plans by hand, suspends non-payers.

## What must always be true
- A printed dynamic code never changes; only its destination does.
- A code can always be found again: by number, name or link.
- A mistake is recoverable: deleted codes sit in the trash for 30 days.
- One workspace can never see another workspace's data.

## Surfaces
- `/` marketing site: persuade a business owner to start free.
- `/dashboard` panel: operate. Speed and scanability beat decoration.
- `/login`, `/register` and recovery pages.
- `/p/[token]` public record page, `/s/[code]` scan resolver.

## Voice
Plain, short, concrete. Buttons name their action. Errors say what happened and what to do next.
