import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SITE_URL } from '@/lib/site';
import './globals.css';

// Self-hosted at build time: no external font request, no layout shift.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

const TITLE = 'QR Code Manager — Dynamic QR Codes for Any Business';
const DESCRIPTION =
  'Create dynamic QR codes you can edit after printing. Build menus, inventories, badges and warranties with custom fields, device and geo routing, scan analytics and 300 DPI print export.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | QR Code Manager' },
  description: DESCRIPTION,
  applicationName: 'QR Code Manager',
  keywords: [
    'dynamic QR code generator',
    'QR code manager',
    'editable QR code',
    'QR code analytics',
    'QR menu',
    'inventory QR codes',
    'QR code SaaS',
    'bulk QR codes',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'QR Code Manager',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#050A1F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased selection:bg-[#EEEAFE] selection:text-[#5B43D6]">{children}</body>
    </html>
  );
}
