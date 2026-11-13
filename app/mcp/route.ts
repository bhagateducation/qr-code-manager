import { z } from "zod";
import { getSiteOrigin } from "@/lib/site-origin";
import { publicInfoResult, publicInfoTool } from "@/lib/public-discovery";
import { capabilities, protocolVersion, serverInfo } from "@/lib/public-mcp";

const rpc = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});
const call = z.object({
  name: z.literal(publicInfoTool.name),
  arguments: z.object({}).strict().optional(),
});
const headers = { "Cache-Control": "no-store" };
const error = (id: string | number | null, code: number, message: string, status = 200) =>
  Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers });

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== (getSiteOrigin()?.origin ?? new URL(request.url).origin)) {
    return error(null, -32000, "Origin is not allowed", 403);
  }
  const version = request.headers.get("mcp-protocol-version");
  if (version && version !== protocolVersion && version !== "2025-06-18") {
    return error(null, -32600, "Unsupported protocol version", 400);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return error(null, -32600, "Content-Type must be application/json", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return error(null, -32700, "Invalid JSON", 400);

  let input: unknown;
  try {
    const decoder = new TextDecoder();
    let body = "";
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        return error(null, -32600, "Request is too large", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    input = JSON.parse(body + decoder.decode());
  } catch {
    return error(null, -32700, "Invalid JSON", 400);
  }

  const parsed = rpc.safeParse(input);
  if (!parsed.success) return error(null, -32600, "Invalid request", 400);
  const { id, method, params } = parsed.data;
  if (id === undefined) return new Response(null, { status: 202, headers });

  let result: unknown;
  switch (method) {
    case "initialize":
      result = { protocolVersion: params?.protocolVersion === "2025-06-18" ? "2025-06-18" : protocolVersion, serverInfo, capabilities };
      break;
    case "ping":
      result = {};
      break;
    case "tools/list":
      result = { tools: [publicInfoTool] };
      break;
    case "tools/call":
      if (!call.safeParse(params).success) return error(id, -32602, "Invalid tool name or arguments");
      result = publicInfoResult();
      break;
    default:
      return error(id, -32601, "Method not found");
  }
  return Response.json({ jsonrpc: "2.0", id, result }, { headers });
}
