const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.razorpay.com; font-src 'self'; connect-src 'self' https://*.razorpay.com; frame-src https://*.razorpay.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
];
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: security }];
  },
  async redirects() {
    return [
      ...[
        "qr-dashboard.html",
        "qr-builder.html",
        "qr-system-builder.html",
        "demo-hub.html",
      ].map((path) => ({
        source: `/${path}`,
        destination: "/dashboard",
        permanent: false,
      })),
      { source: "/login.html", destination: "/login", permanent: false },
      { source: "/register.html", destination: "/register", permanent: false },
      { source: "/index.html", destination: "/", permanent: false },
    ];
  },
};
