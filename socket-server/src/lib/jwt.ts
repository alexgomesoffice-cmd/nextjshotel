import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Optionally, move JWT logic here for reuse (e.g. issuing tokens)
export function generateToken(user: { userId: number; name: string }) {
  return jwt.sign({ user }, env.JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { user: any };
}
