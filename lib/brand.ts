// White-label: resellers set these at build time; nothing else in the UI hardcodes the product name.
export const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "QR Code Generator";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
