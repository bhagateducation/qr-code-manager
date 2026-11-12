import "server-only";

export function getSiteOrigin() {
  const value = process.env.APP_URL;
  if (!value) return undefined;

  const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:" ? new URL(url.origin) : undefined;
}
