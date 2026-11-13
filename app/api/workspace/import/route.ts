import { NextRequest } from "next/server";
import { authorize, failure, json, rateLimit, ApiError } from "@/lib/http";
import { parseImport } from "@/lib/office";

/** Reads an uploaded CSV, Excel or Word file and returns its rows; the panel then imports them in batches. */
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== new URL(process.env.APP_URL!).origin) throw new ApiError(403, "Request origin is not allowed.");
    if (Number(request.headers.get("content-length") || 0) > 10.5 * 1024 * 1024) throw new ApiError(413, "The file is larger than 10 MB.");
    const user = await authorize(true);
    await rateLimit(`import:${user.id}`, 20, 60);
    const upload = (await request.formData()).get("file");
    if (!(upload instanceof File)) throw new ApiError(400, "Choose a file to import.");
    if (upload.size > 10 * 1024 * 1024) throw new ApiError(413, "The file is larger than 10 MB.");
    const rows = await parseImport(upload.name, Buffer.from(await upload.arrayBuffer()));
    if (!rows.length) throw new ApiError(400, "No rows with a Title were found. Download the format and fill it in.");
    if (rows.length > 5000) throw new ApiError(400, "Import up to 5,000 rows at a time.");
    return json({ rows });
  } catch (error) {
    return failure(error);
  }
}
