# 📱 QR Code Manager SaaS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Hostinger: Ready](https://img.shields.io/badge/Hostinger-100%25%20Ready-green.svg)](README-HOSTINGER.md)
[![TailwindCSS: Bundled](https://img.shields.io/badge/TailwindCSS-v3%20Bundled-purple.svg)](js/tailwindcss.js)
[![Zero-Dependencies](https://img.shields.io/badge/Dependencies-0-orange.svg)](#zero-dependency-architecture)

> **Universal, multi-tenant standalone SaaS platform for modeling QR-powered business systems, attaching dynamic and static QR codes, executing physical business functions, and tracking privacy-conscious scan telemetry without writing code.**

---

## 🌟 Overview & Key Capabilities

- **🌐 Public Marketing Website (`index.html`)**: High-converting sales page with live interactive product dashboard mockup, 12 QR types catalog, 21 template showcase, real SVG telemetry charts, transparent tiered pricing, and persistent demo switcher.
- **📊 Client SaaS Panel (`qr-dashboard.html`)**: Isolated tenant workspace with 252px dark sidebar, 16 navigation items with inline SVGs, 4 KPI metric cards, 30-day scan velocity area chart, recent QR codes table, and real-time audit activity feed.
- **⚙️ Universal System Builder (`qr-system-builder.html`)**: No-code business schema builder for modeling products, menus, employee IDs, assets, and tickets with 14 custom fields, 23 grouped types, dynamic field editor, status lifecycles, and dependency impact analysis modals.
- **⚡ QR Studio & Generator (`qr-builder.html`)**: Real-time client-side QR generator supporting instant payload updates, color customizations, eye corner styles, error correction levels (L, M, Q, H), 5-step wizard navigation, and direct downloads for PNG, vector SVG, and Print-ready formats.
- **📱 Public Scan Experience (`scan-preview.html`)**: Responsive mobile destination page triggered on scan, featuring serial verification, cryptographic warranty checks, maintenance ticket logging, and PDF manual downloads.
- **🧭 Showcase & Reviewer Hub (`demo-hub.html`)**: Central directory linking all application surfaces.

---

## 📁 Repository Structure

```text
qr-code-manager/
├── index.html               # Flagship Marketing Landing Page (Default Hostinger Root)
├── qr-dashboard.html        # Client SaaS Workspace Dashboard
├── qr-system-builder.html   # No-Code Business System & Schema Builder
├── qr-builder.html          # Interactive QR Code Studio & Vector Generator
├── qr-marketing.html        # Standalone Marketing Site File
├── scan-preview.html        # Public Mobile Scan Experience
├── demo-hub.html            # UI Showcase & Navigation Directory
├── README.md                # Project Documentation & Architecture
├── README-HOSTINGER.md      # Step-by-Step Hostinger Deployment Guide
├── qr-code-manager-hostinger.zip # Pre-packaged Production Deployment Archive
└── js/
    ├── tailwindcss.js       # Bundled Standalone Tailwind CSS Engine
    └── qrcode.min.js        # Bundled Standalone Client-side QRCode Generator
```

---

## 🚀 Deployment to Hostinger

This project is pre-configured for instant static hosting on **Hostinger** (Shared Hosting, Cloud Hosting, or VPS):

1. Log into your **[Hostinger hPanel](https://hpanel.hostinger.com/)** and open **File Manager**.
2. Navigate to your domain's **`public_html`** directory.
3. Upload `qr-code-manager-hostinger.zip` and extract directly into `public_html`.
4. Open your domain in any browser (`https://yourdomain.com`). All screens and assets are self-contained and active.

For detailed instructions, refer to [README-HOSTINGER.md](README-HOSTINGER.md).

---

## 🔒 Zero-Dependency Architecture & Privacy

- **Offline / Local First**: All styling and QR generation libraries are bundled locally in `/js/` with automatic CDN fallback.
- **Privacy-Conscious Telemetry**: No tracking cookies, third-party analytics pixels, or intrusive fingerprinting scripts.
- **Multi-Tenant Scoping**: All workspace interfaces enforce tenant-level role boundaries and data separation.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
