import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;

  try {
    // 1. Look up QR code from database
    const qr = await prisma.qRCode?.findUnique({
      where: { shortCode: code },
    }).catch(() => null);

    let destination = qr?.targetUrl || 'https://rosybrown-narwhal-127133.hostingersite.com';

    // 2. Evaluate Conditional Device Routing Rules
    const userAgent = request.headers.get('user-agent') || '';
    if (qr?.routingRules && typeof qr.routingRules === 'object') {
      const rules = qr.routingRules as Record<string, string>;
      if (/iPhone|iPad|iPod/i.test(userAgent) && rules.ios) {
        destination = rules.ios;
      } else if (/Android/i.test(userAgent) && rules.android) {
        destination = rules.android;
      }
    }

    // 3. Asynchronously record scan telemetry in background
    if (qr?.id) {
      prisma.scanLog?.create({
        data: {
          qrCodeId: qr.id,
          device: /Mobile|Android|iPhone/i.test(userAgent) ? 'Mobile' : 'Desktop',
          browser: /Chrome/i.test(userAgent) ? 'Chrome' : /Safari/i.test(userAgent) ? 'Safari' : 'Other',
          os: /iPhone|iPad/i.test(userAgent) ? 'iOS' : /Android/i.test(userAgent) ? 'Android' : 'Desktop',
          country: request.headers.get('x-vercel-ip-country') || 'IN',
          city: request.headers.get('x-vercel-ip-city') || 'Mumbai',
        },
      }).catch(() => {});

      // Increment total count
      prisma.qRCode?.update({
        where: { id: qr.id },
        data: { scanCount: { increment: 1 } },
      }).catch(() => {});
    }

    // 4. Instant 302 Redirect
    return NextResponse.redirect(new URL(destination), 302);
  } catch (error) {
    return NextResponse.redirect(new URL('https://rosybrown-narwhal-127133.hostingersite.com'), 302);
  }
}
