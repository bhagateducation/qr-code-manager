import { BRAND } from "./brand";
import { publicInfoTool } from "./public-discovery";

export const protocolVersion = "2025-11-25";
export const serverInfo = { name: "qr-manager-public", title: BRAND, version: "1.0.0" };
export const capabilities = { tools: {} };

export const serverCard = {
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  version: "1.0",
  protocolVersion,
  serverInfo,
  description: "Public information about QR Code Generator.",
  transport: { type: "streamable-http", endpoint: "/mcp" },
  capabilities,
  authentication: { required: false },
  tools: [publicInfoTool],
};

export function getServerCard() {
  return Response.json(serverCard, { headers: { "Cache-Control": "public, max-age=3600" } });
}
