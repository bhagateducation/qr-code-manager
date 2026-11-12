// React dev tooling needs eval and the HMR socket; production stays strict.
const dev = process.env.NODE_ENV !== "production";
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
      `default-src 'self'; script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.razorpay.com; font-src 'self'; connect-src 'self'${dev ? ' ws:' : ''} https://*.razorpay.com; frame-src https://*.razorpay.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  },
];
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  async headers() {
    return [
      { source: "/:path*", headers: security },
      { source: "/", headers: [
        { key: "Link", value: '</llms.txt>; rel="describedby"; type="text/plain", </home.md>; rel="alternate"; type="text/markdown"' },
      ] },
    ];
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
      { source: "/login.html", destination: "/login", permanent: true },
      { source: "/register.html", destination: "/register", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
    ];
  },
};
