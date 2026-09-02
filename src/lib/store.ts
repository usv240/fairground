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

// ─── The Docket: public aggregate stats ─────────────────────────────────────
// Incremented once, atomically, when a case reaches "resolved". Aggregates
// only — no case content ever leaves the case record.

const memStats = ((globalThis as unknown as { __fgStats?: Record<string, number> }).__fgStats ??= {
  resolved: 0, dollars: 0, minutes: 0, fairSum: 0, fairCount: 0,
});

export async function recordFairness(rating: number): Promise<void> {
  if (redis) {
    await Promise.all([
      redis.incrby("stats:fairsum", rating),
      redis.incr("stats:faircount"),
    ]);
    return;
  }
  memStats.fairSum += rating;
  memStats.fairCount += 1;
}

export async function recordResolution(c: DisputeCase): Promise<void> {
  const minutes = Math.max(1, Math.round((Date.now() - c.createdAt) / 60000));
  const dollars = c.settledAmount ?? 0;
  if (redis) {
    await Promise.all([
      redis.incr("stats:resolved"),
      redis.incrby("stats:dollars", dollars),
      redis.incrby("stats:minutes", minutes),
    ]);
    return;
  }
  memStats.resolved += 1;
  memStats.dollars += dollars;
  memStats.minutes += minutes;
}

export async function getStats(): Promise<{
  resolved: number; dollars: number; avgMinutes: number;
  fairness: number | null; fairnessCount: number;
}> {
  if (redis) {
    const [resolved, dollars, minutes, fairSum, fairCount] = await Promise.all([
      redis.get<number>("stats:resolved"),
      redis.get<number>("stats:dollars"),
      redis.get<number>("stats:minutes"),
      redis.get<number>("stats:fairsum"),
      redis.get<number>("stats:faircount"),
    ]);
    const r = resolved ?? 0;
    const fc = fairCount ?? 0;
    return {
      resolved: r, dollars: dollars ?? 0,
      avgMinutes: r ? Math.round((minutes ?? 0) / r) : 0,
      fairness: fc ? Math.round(((fairSum ?? 0) / fc) * 10) / 10 : null,
      fairnessCount: fc,
    };
  }
  return {
    resolved: memStats.resolved,
    dollars: memStats.dollars,
    avgMinutes: memStats.resolved ? Math.round(memStats.minutes / memStats.resolved) : 0,
    fairness: memStats.fairCount ? Math.round((memStats.fairSum / memStats.fairCount) * 10) / 10 : null,
    fairnessCount: memStats.fairCount,
  };
}

export function newId(prefix = ""): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // unambiguous
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return prefix ? `${prefix}_${s}` : s;
}
