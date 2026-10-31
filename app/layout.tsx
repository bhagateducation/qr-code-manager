import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Code Manager — Universal QR-Powered Business SaaS',
  description: 'Commercial standalone QR Code OS with dynamic routing, custom business schemas, and isolated client workspaces.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-[#EEEAFE] selection:text-[#5B43D6]">
        {children}
      </body>
    </html>
  );
}
