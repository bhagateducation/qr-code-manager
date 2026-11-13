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
   - **Book QR.** For a book, enter its name, pick the folder it goes in, and say how many questions each chapter has. The link pattern is optional. One click creates a folder for the book, a folder per chapter and a dynamic code for every question (up to 1,000 at a time), numbered in order. A code without a link opens its own QR page on your domain until you add one, so a scan never shows an error.
   - **Add inside a folder.** Open any folder and use **Add**: one code, many numbered codes (Q21 to Q40, with an optional link pattern using `{n}`), a YouTube playlist, or a new sub-folder. Codes made without choosing a folder are never lost: they sit under **Not in a folder**.
   - **YouTube playlist.** Paste a public playlist link; every video becomes a dynamic code named after the video, in playlist order, in a new folder named after the playlist (or a folder you pick).
   - **Order.** Inside a folder the list uses *Manual order*: drag a row by its handle or type its position number. Drag folder tiles, or set a folder's position in **Folder settings**. Print sheets and exports follow this order.
   - **Folder settings.** Rename a folder, set its position, or delete it — either keeping its codes (they move to *Not in a folder*) or moving them to the trash.
   - **Bulk actions.** Tick several codes to pause, resume, move to a folder or trash them together (up to 100 at a time).
   - **Trash.** Deleting moves a code to the trash, where it stops working but can be restored for 30 days. After that it is removed for good. Only an owner or admin can delete permanently or empty the trash.
   - **Shortcuts.** Press `Ctrl K` anywhere to jump to a page, start something new or search your codes. The **New** button in the header creates a code, system, campaign or tag. In the list, the download icon saves the PNG without opening the code.
5. **Systems & records** are your own tables (products, assets, members). Publish a record to get a read-only public page, then point a website link code at that page.
6. **Analytics** shows scans per day, top codes, operating systems, browsers and busiest hours for today, 7, 30 or 90 days. *Export all scans* downloads a CSV.
7. **Team.** The owner invites people as admin, editor or viewer. If email delivery is not configured, copy the invitation link shown on screen and send it yourself.
8. **Settings.** Rename the workspace, change your password (this signs out your other devices), turn on two-step sign-in, and use **Sign out other devices** if you used a shared or lost device. Keep the eight backup codes; each works once if you lose your phone.
9. **Appearance.** The sun or moon button in the top bar switches accent colour and light or dark mode. The choice is saved in that browser.
10. **Menu.** The button at the top of the menu switches between full menu and icons only (the menu opens while you point at it). Drag the menu's right edge to make it wider or narrower; double-click the edge to reset. On mid-size screens the menu shows icons by itself.
11. **Notifications.** The bell in the top bar shows updates from the platform, plan reminders and payment confirmations.

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
- **Import / Export.** Export a folder (or everything) to Excel or Word with each code's QR image, folder by folder in order. Import from Excel, Word or CSV in the downloadable format (QR number, Title, Link, Folder). A row with an existing QR number updates that code's title and link, so you can export, fill in links and import back.
- **Share.** The Share button copies a link to a page that shows the QR image itself (with PNG and SVG downloads), not the code's destination.
- **Print quality.** The list's download icon saves a 2048-pixel PNG. In the editor choose PNG HD (2048), PNG print (4096) or SVG (vector, any size, smallest file). Print sheets let you pick a QR size from 2 to 7 cm; print codes at least 2 × 2 cm.
- Changing a website code's link never changes its image. This is tested automatically.

## Panels and custom domains

- **Panels** are separate workspaces inside one account, for example one per branch. The account owner creates them under Panels and switches between them from the box at the top of the menu. Each panel has its own codes, folders and members; the plan's limits are shared.
- **Custom domain** (Settings, on plans that include it): add the CNAME and TXT records shown, then press Check now. Codes use the domain only while it is verified and working; if it fails, new copies and downloads switch back to the main domain automatically and a warning appears. Codes already printed with the custom domain need its DNS to stay pointed at us.

## For the platform owner

Sign in at the same `/dashboard`. There is exactly one platform owner, and its workspace has no limits. The Platform part of the menu appears only for that account.

- **Clients**: revenue, paying, expiring and expired counts; every client with plan, end date, codes used, storage and last activity. Open one to set or extend their plan, record a cash, UPI or bank payment, give them custom limits or storage (or unlimited), switch features on or off, keep private notes, open their panel to help them, or suspend them (their panels stop too).
- **Send reminders now** emails clients whose plan ends within 7 days (needs email sending set up). It also runs on its own every 6 hours.
- **Payments**: every purchase, paid or pending, with totals, search, CSV export, *Check with Razorpay* for orders whose confirmation never arrived, and *Send receipt*.
- **Configuration**: connect Razorpay (keys are tested, stored encrypted and never shown again), set up email by SMTP (for Hostinger mail: smtp.hostinger.com, port 465) or Resend and send a test, turn on an email code at sign-in (off, account owners, or everyone; skipped while email is not set up), and send notifications to every client or one client, optionally by email too.
- **Emails sent automatically**: welcome, plan ending soon and plan ended reminders, payment receipts (Razorpay and payments you record), sign-in codes, invitations and password resets. From a client's **Email** tab you can also send a reminder, a plan-ended notice, the last receipt or your own message.
- **Plans**: create and edit plans: price, length in days, limits (or unlimited), storage, panels, team size, features, and whether the plan shows on the website.
- **Website**: edit the home page headline, text, use cases, questions and which sections show. Saving publishes it within a minute.
- Each action is written to your audit log.
