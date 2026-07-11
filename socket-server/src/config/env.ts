import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 4001,
  JWT_SECRET: process.env.JWT_SECRET || "change_this_secret",
  COOKIE_NAME: process.env.COOKIE_NAME || "token",
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
};