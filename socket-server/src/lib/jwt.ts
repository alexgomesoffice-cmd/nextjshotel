/**
 * JWT verification using Node.js Web Crypto API.
 *
 * This is a direct port of the Next.js app's src/lib/jwt.ts verifyToken
 * function so both processes verify the same tokens with the same algorithm.
 * The Next.js app hashes the raw JWT_SECRET with SHA-256 before using it
 * as the HMAC key — we must do exactly the same here.
 */

import type { JwtPayload } from "../types/socket.js";

function normalizeSecret(secret: string | undefined): string {
  if (!secret) {
    return "change_this_secret";
  }
  return secret.replace(/^"(.+)"$/, "$1");
}

const SECRET = normalizeSecret(process.env.JWT_SECRET);

async function base64UrlDecode(base64: string): Promise<ArrayBuffer> {
  let base64Url = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (base64Url.length % 4) base64Url += "=";
  // Use Node's Buffer — atob is available in Node 18+ but Buffer is safer
  const binary = Buffer.from(base64Url, "base64");
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
}

async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET);
  const hash = await crypto.subtle.digest("SHA-256", keyData);

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
  const signingInput = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const signingInputBuffer = encoder.encode(signingInput).buffer as ArrayBuffer;
  const signatureBuffer = await base64UrlDecode(signatureB64);

  const signingKey = await getSigningKey();
  const isValid = await crypto.subtle.verify(
    { name: "HMAC", hash: "SHA-256" },
    signingKey,
    signatureBuffer,
    signingInputBuffer
  );

  if (!isValid) throw new Error("Invalid signature");

  const payloadBuffer = await base64UrlDecode(payloadB64);
  const payloadStr = Buffer.from(payloadBuffer).toString("utf8");
  const payload = JSON.parse(payloadStr) as JwtPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("Token expired");

  return payload;
}
