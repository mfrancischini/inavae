import { createHmac, timingSafeEqual } from "node:crypto";

export function buildSessionToken(userId: string, expiresAt: number, secret: string) {
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function validateSessionToken(token: string, secret: string, now: number) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [userId, expiresAtValue, signature] = parts;
  const expiresAt = Number(expiresAtValue);

  if (!userId || !signature || !Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${userId}.${expiresAt}`)
    .digest("hex");

  if (signature.length !== expectedSignature.length) return false;

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
