# QR Code Manager SaaS — Hostinger Deployment Guide

This package is 100% self-contained and pre-configured for static hosting on Hostinger (Shared Hosting, Cloud Hosting, or VPS).

---

## 🚀 How to Deploy on Hostinger (3 Steps)

### Step 1: Log in to Hostinger hPanel
1. Go to [Hostinger hPanel](https://hpanel.hostinger.com/) and log in.
2. Select your domain / hosting plan and click **Manage**.
3. Under the **Files** section, open **File Manager** (or use FTP / FileZilla).

### Step 2: Upload and Extract
1. Open the `public_html` directory for your domain.
2. If there is a default `default.php` or placeholder file, delete or rename it.
3. Click the **Upload** icon (top right) and upload `qr-code-manager-hostinger.zip`.
4. Right-click `qr-code-manager-hostinger.zip` in File Manager and click **Extract**.
5. Ensure the extracted files (`index.html`, `qr-dashboard.html`, `js/`, etc.) are placed directly in `public_html/`.

### Step 3: Visit Your Domain
Open your browser and navigate to `https://yourdomain.com`:
- `https://yourdomain.com/` — Loads the full high-conversion SaaS Marketing Landing Page (`index.html`).
- `https://yourdomain.com/qr-dashboard.html` — Client SaaS Dashboard with KPI cards, scan telemetry chart, and activity feed.
- `https://yourdomain.com/qr-system-builder.html` — Universal No-Code Business System & Schema Builder.
- `https://yourdomain.com/qr-builder.html` — Interactive QR Code Studio with live scannable QR generation and PNG/SVG/Print downloads.
- `https://yourdomain.com/scan-preview.html` — Mobile destination scan experience for public records.
- `https://yourdomain.com/demo-hub.html` — UI Showcase and quick switcher hub.

---

## 🛠️ Included Assets & Verification

| File / Folder | Purpose |
|---|---|
| `index.html` | Flagship SaaS marketing website with interactive demo navigation |
| `qr-dashboard.html` | SaaS client panel with 252px dark sidebar, metrics, and systems grid |
| `qr-system-builder.html` | Custom schema builder with 14 fields, 23 grouped types, and impact modal |
| `qr-builder.html` | Live QR generator with real-time payload updates, colors, and PNG/SVG download |
| `scan-preview.html` | Responsive mobile phone scan page with warranty check and ticket actions |
| `demo-hub.html` | Developer and reviewer showcase directory |
| `js/tailwindcss.js` | Bundled standalone Tailwind CSS engine (no external CDN required) |
| `js/qrcode.min.js` | Bundled client-side QRCode engine (100% offline & fast) |

---

## 🔒 Security & Privacy Notes
- **Zero External Dependencies**: All scripts are bundled locally inside `/js/` with automatic fallback to global CDNs.
- **Privacy-Friendly Analytics**: No invasive trackers or cookies are required to render any page.
- **Strict Tenant Separation**: Workspace contexts and mock data isolate client records from owner CMS configurations.

