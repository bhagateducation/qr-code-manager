# QR Code Generator user guide

## For a customer

1. **Sign up** with your name, business name, email and a password of at least 12 characters. You get your own Free workspace.
2. **Create a QR code.** Choose *Create QR code*, pick a type, name it and save.
   - *Website link* codes are dynamic: the printed code never changes and you can edit where it leads. They also support separate iPhone and Android destinations and an end date.
   - *Contact card*, *Wi-Fi* and *Plain text* codes store their content inside the code, so reprint after editing them.
3. **Download** the PNG or SVG. Every image is decoded and checked before the buttons are enabled. Keep the white margin when printing.
4. **Organise** codes with tags and campaigns. Pause a code to stop it working without deleting it.
   - **Numbers.** Every code gets its own number, such as `QR-00042`. A number is never reused, even after the code is deleted.
   - **Find.** Search by number, name or link. Narrow the list by status, type, campaign or tag, sort it, and show 25, 50 or 100 rows. Type a page number to jump straight to it.
   - **Folders.** Folders are your categories, and they nest (Book, then Chapter). Open a folder to see every code inside it and its sub-folders. Make one with **New folder** in the list, or with **New** next to the folder box while creating a code. **Print sheet** lays out all of a folder's codes with their names and numbers, ready to print or save as PDF. Deleting a folder keeps its codes.
   - **Book QR.** For a book, enter its name, the link pattern and how many questions each chapter has. One click creates a folder for the book, a folder per chapter and a dynamic code for every question (up to 1,000 at a time), numbered in order.
   - **Bulk actions.** Tick several codes to pause, resume, move to a folder or trash them together (up to 100 at a time).
   - **Trash.** Deleting moves a code to the trash, where it stops working but can be restored for 30 days. After that it is removed for good. Only an owner or admin can delete permanently or empty the trash.
   - **Shortcuts.** Press `Ctrl K` anywhere to jump to a page, start something new or search your codes. The **New** button in the header creates a code, system, campaign or tag. In the list, the download icon saves the PNG without opening the code.
5. **Systems & records** are your own tables (products, assets, members). Publish a record to get a read-only public page, then point a website link code at that page.
6. **Analytics** shows scans per day, top codes, operating systems, browsers and busiest hours for today, 7, 30 or 90 days. *Export all scans* downloads a CSV.
7. **Team.** The owner invites people as admin, editor or viewer. If email delivery is not configured, copy the invitation link shown on screen and send it yourself.
8. **Settings.** Rename the workspace, change your password (this signs out your other devices), turn on two-step sign-in, and use **Sign out other devices** if you used a shared or lost device. Keep the eight backup codes; each works once if you lose your phone.
9. **Appearance.** The sun or moon button in the top bar switches accent colour and light or dark mode. The choice is saved in that browser.

## Plans

| Plan | QR codes | Systems | Records |
| --- | --- | --- | --- |
| Free | 10 | 1 | 50 |
| Pro | 500 | 10 | 5,000 |
| Business | 2,500 | 50 | 25,000 |

Paid plans last 30 days and do not renew automatically. When a plan ends, limits return to Free. Nothing is deleted and existing codes keep working; you only cannot create beyond the Free limits.

## For developers

- **API keys** (owner or admin): send the key in an `x-api-key` header to `GET /api/v1/qr` and `POST /api/v1/qr`. The key is shown once.
- **Webhooks** (owner or admin): add a public HTTPS endpoint to receive a `scan.created` event on every scan. Verify it by computing HMAC-SHA256 of the raw body with your signing secret and comparing with the `X-QR-Manager-Signature` header.

## Copying and printing

- **Copy QR image** puts the picture on the clipboard, ready to paste into WhatsApp, Word or a design tool. The download icon saves a PNG.
- **Name and number on images** (a tick box in the list and the editor) adds the code's name and number under the QR on copies, downloads and print sheets. Off gives the plain QR. The choice is remembered on that device.
- **Import CSV** creates many codes at once from a file with the columns title, url and folder.
- Changing a website code's link never changes its image. This is tested automatically.

## Panels and custom domains

- **Panels** are separate workspaces inside one account, for example one per branch. The account owner creates them under Panels and switches between them from the box at the top of the menu. Each panel has its own codes, folders and members; the plan's limits are shared.
- **Custom domain** (Settings, on plans that include it): add the CNAME and TXT records shown, then press Check now. Codes use the domain only while it is verified and working; if it fails, new copies and downloads switch back to the main domain automatically and a warning appears. Codes already printed with the custom domain need its DNS to stay pointed at us.

## For the platform owner

Sign in at the same `/dashboard`. There is exactly one platform owner, and its workspace has no limits. The Platform part of the menu appears only for that account.

- **Clients**: revenue, paying, expiring and expired counts; every client with plan, end date, codes used, storage and last activity. Open one to set or extend their plan, record a cash, UPI or bank payment, give them custom limits or storage (or unlimited), switch features on or off, keep private notes, open their panel to help them, or suspend them (their panels stop too).
- **Send reminders now** emails clients whose plan ends within 7 days (needs email sending set up). It also runs on its own every 6 hours.
- **Plans**: create and edit plans: price, length in days, limits (or unlimited), storage, panels, team size, features, and whether the plan shows on the website.
- **Website**: edit the home page headline, text, use cases, questions and which sections show. Saving publishes it within a minute.
- Each action is written to your audit log.
