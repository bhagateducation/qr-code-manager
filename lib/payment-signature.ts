import { createHmac, timingSafeEqual } from "node:crypto";
export function validSignature(
  payload: string,
  signature: string,
  secret: string,
) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(
      createHmac("sha256", secret).update(payload).digest("hex"),
      "hex",
    ),
    Buffer.from(signature, "hex"),
  );
}
