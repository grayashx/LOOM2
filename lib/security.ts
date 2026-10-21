import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyHmacSha256(rawBody: string, header: string | null, secret: string) {
  if (!header || !secret) return false;
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function safeRedirect(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
