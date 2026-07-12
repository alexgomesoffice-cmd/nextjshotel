import dotenv from "dotenv";

dotenv.config();

function normalizeSecret(secret: string | undefined): string {
  if (!secret) return "change_this_secret";
  return secret.replace(/^"(.+)"$/, "$1");
}

export const env = {
  PORT: Number(process.env.PORT) || 4001,
  JWT_SECRET: normalizeSecret(process.env.JWT_SECRET),
  COOKIE_NAME: process.env.COOKIE_NAME ?? process.env.JWT_COOKIE_NAME ?? "token",
  ALLOWED_ORIGIN: process.env.CORS_ORIGIN ?? process.env.CLIENT_URL ?? "http://localhost:3000",
  SOCKET_SECRET: process.env.SOCKET_SECRET ?? "dev_socket_secret",
};