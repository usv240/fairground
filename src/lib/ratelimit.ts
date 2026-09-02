import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

// Cost protection: model-backed endpoints are limited per IP. Only active
// when Redis is configured (production); local dev is unlimited.

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const limiter = url && token
  ? new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(40, "60 s"), // generous for real use, hostile to abuse
      prefix: "rl",
    })
  : null;

export async function checkRateLimit(req: NextRequest): Promise<boolean> {
  if (!limiter) return true;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  try {
    const { success } = await limiter.limit(ip);
    return success;
  } catch {
    return true; // never block on limiter failure
  }
}
