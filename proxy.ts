import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const acceptsMarkdown = request.headers.get("accept")?.split(",").some((entry) => {
    const [type, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return type.trim() === "text/markdown" && (!quality || Number(quality.trim().slice(2)) > 0);
  });
  if (acceptsMarkdown && !request.headers.has("rsc")) {
    return NextResponse.rewrite(new URL("/home.md", request.url));
  }
  const response = NextResponse.next();
  response.headers.append("Vary", "Accept");
  return response;
}

export const config = { matcher: ["/"] };
