import { Redis } from "@upstash/redis";
import { DisputeCase } from "./types";

// Storage: Upstash Redis in production, in-memory Map during local development.
// Accepts both direct Upstash env names (UPSTASH_REDIS_REST_*) and the names
// injected by the Vercel Marketplace integration (KV_REST_API_*).

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const globalStore = globalThis as unknown as { __fairgroundCases?: Map<string, DisputeCase> };
const memory = (globalStore.__fairgroundCases ??= new Map<string, DisputeCase>());

const TTL_SECONDS = 60 * 60 * 24 * 30; // cases live 30 days

export async function getCase(id: string): Promise<DisputeCase | null> {
  if (redis) {
    const data = await redis.get<DisputeCase>(`case:${id}`);
    return data ?? null;
  }
  return memory.get(id) ?? null;
}

export async function saveCase(c: DisputeCase): Promise<void> {
  if (redis) {
    await redis.set(`case:${c.id}`, c, { ex: TTL_SECONDS });
    return;
  }
  memory.set(c.id, c);
}

export function newId(prefix = ""): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // unambiguous
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return prefix ? `${prefix}_${s}` : s;
}
