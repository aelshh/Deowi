import dotenv from "dotenv";
if (!process.env.REDIS_URL) {
  dotenv.config({ path: "../.env.local" });
}
