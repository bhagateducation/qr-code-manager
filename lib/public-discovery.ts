import { BRAND, SUPPORT_EMAIL } from "./brand";

export const DESCRIPTION = "Create dynamic QR codes, change their destinations after printing, and track scans from one workspace.";
export const COMPANY = "Bhagat Education";
export const COMPANY_URL = "https://bhagateducation.in/";
export const CONTACT_URL = new URL("contact", COMPANY_URL).href;
export const CONTACT_EMAIL = SUPPORT_EMAIL || "armystudyweb@gmail.com";
export const PROFILES = ["https://github.com/bhagateducation"];

export const publicInfoTool = {
  name: "get_qr_manager_info",
  description: "Read the public overview, product capabilities, and official links for QR Code Generator.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, openWorldHint: false },
};

export function publicOverview() {
  return `# ${BRAND}

> ${DESCRIPTION}

${BRAND} is a web app from ${COMPANY}. Teams can manage dynamic QR codes, update destinations, review scan activity, and organize codes in a shared workspace.

## Key pages

- [Product homepage](/)
- [About](/about)
- [Contact and support](/contact)
- [Create an account](/register)
`;
}

export function publicInfoResult() {
  return { content: [{ type: "text" as const, text: publicOverview() }] };
}
