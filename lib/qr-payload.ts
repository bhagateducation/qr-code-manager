export type QRType = "dynamic_url" | "wifi" | "vcard" | "text";

function escapeWifi(value: string) {
  return value.replace(/[\\;,:]/g, (character) => `\\${character}`);
}

function escapeVCard(value: string) {
  return value.replace(/[\\;,\n\r]/g, (character) => {
    if (character === "\n" || character === "\r") return "\\n";
    return `\\${character}`;
  });
}

export function buildWifiPayload(input: {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}) {
  const security = input.security === "nopass" ? "nopass" : input.security;
  return `WIFI:T:${security};S:${escapeWifi(input.ssid)};P:${escapeWifi(input.password)};H:${input.hidden ? "true" : "false"};;`;
}

export function buildVCardPayload(input: {
  name: string;
  organization: string;
  phone: string;
  email: string;
  url: string;
}) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(input.name)}`,
    input.organization.trim() ? `ORG:${escapeVCard(input.organization)}` : "",
    input.phone.trim() ? `TEL;TYPE=CELL:${escapeVCard(input.phone)}` : "",
    input.email.trim() ? `EMAIL:${escapeVCard(input.email)}` : "",
    input.url.trim() ? `URL:${escapeVCard(input.url)}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\n");
}
