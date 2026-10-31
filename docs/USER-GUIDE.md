# QR Manager usage

## Customer workflow
1. Register with name, email, workspace name and a password of at least 12 characters. This creates an independent Free workspace.
2. Open QR codes, choose Create QR code, enter its name and a public HTTP(S) destination, then Save & generate QR.
3. The preview is decoded and checked against its expected link. Download PNG or vector SVG. Preserve the white margin around the code.
4. Editing the destination keeps the same short link, so an existing print continues to work. Pause/Resume controls whether it redirects. Optional iOS and Android links override the main destination for those devices; expiry is entered in UTC.
5. Create a business system with text, number, date, URL and boolean fields. Add or edit records; required fields and value types are checked on the server.
6. Scan activity shows real events and inferred browser/device information. Export shown scans downloads the latest displayed 100 events; it is not an all-time export.
7. Settings renames the workspace and changes the account password. Changing password signs out other sessions. Sign out revokes the current session.

## Plans
Free: 10 QR codes, 1 system, 50 records. Pro: ₹499 per 30 days, 500 QR codes, 10 systems, 5,000 records. Business: ₹1,499 per 30 days, 2,500 QR codes, 50 systems, 25,000 records. Paid checkout is unavailable until Razorpay configuration is complete. On expiry, creation quotas return to Free; saved records are retained and existing QR resolution continues unless paused/expired/suspended.

## Platform owner
Use the same `/dashboard` login. A privately provisioned platform role reveals Platform controls. The owner can see the latest 100 workspaces and suspend/restore them; suspension disables login and QR resolution. A normal customer workspace owner cannot access this API. The owner cannot suspend their own workspace through this screen.

## Scope limits
Team invitations, email verification/recovery and MFA are implemented in the application. Configure the transactional email provider before enforcing verification. Native Wi-Fi/vCard payloads, public record pages, template installation, bulk/PDF exports and advanced automations remain pending. Do not treat legacy demo screenshots or claims as implemented behavior.
