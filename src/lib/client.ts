"use client";

import useSWR from "swr";
import { useRef, useCallback, useEffect } from "react";
import { CaseView } from "./types";

// ─── API helpers ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}

export async function apiCreateCase(payload: Record<string, unknown>) {
  const res = await fetch("/api/case", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse(res) as Promise<{ caseId: string; yourKey: string; yourLink: string; view: CaseView }>;
}

export async function apiAction(caseId: string, key: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/case/${caseId}/action?k=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse(res) as Promise<{ ok: true; message: string; whatNext: string; view: CaseView }>;
}

export async function apiAi(caseId: string, key: string, task: string) {
  const res = await fetch(`/api/case/${caseId}/ai?k=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task }),
  });
  return parse(res);
}

// ─── Live case state (polling keeps both parties in sync) ───────────────────

export function useCase(caseId: string | null, accessKey: string | null) {
  const { data, error, mutate, isLoading } = useSWR<{ view: CaseView; aiTurn: boolean }>(
    caseId && accessKey ? `/api/case/${caseId}?k=${encodeURIComponent(accessKey)}` : null,
    (url: string) => fetch(url).then(parse),
    { refreshInterval: 2500, revalidateOnFocus: true },
  );

  // Practice mode: when the server says the AI counterpart owes a move,
  // trigger it (once per pending move).
  const aiBusy = useRef(false);
  const step = useCallback(async () => {
    if (!caseId || !accessKey || aiBusy.current) return;
    aiBusy.current = true;
    try {
      // small human-feeling delay so the counterpart doesn't respond instantly
      await new Promise(r => setTimeout(r, 1600));
      await apiAi(caseId, accessKey, "opponent_step");
      await mutate();
    } catch {
      /* next poll retries */
    } finally {
      aiBusy.current = false;
    }
  }, [caseId, accessKey, mutate]);

  useEffect(() => {
    if (data?.aiTurn) void step();
  }, [data?.aiTurn, step]);

  return {
    view: data?.view ?? null,
    error: error as ApiError | undefined,
    isLoading,
    refresh: mutate,
  };
}

// ─── Local identity (which cases/keys this browser holds) ───────────────────

export interface StoredCaseRef {
  caseId: string;
  key: string;
  role: "claimant" | "respondent";
  title: string;
  savedAt: number;
}

const LS_KEY = "fairground.cases";

export function rememberCase(ref: StoredCaseRef) {
  try {
    const all = listStoredCases().filter(r => r.caseId !== ref.caseId);
    all.unshift(ref);
    localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, 20)));
  } catch { /* private mode etc. */ }
}

export function listStoredCases(): StoredCaseRef[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function storedKeyFor(caseId: string): StoredCaseRef | undefined {
  return listStoredCases().find(r => r.caseId === caseId);
}

export function formatMoney(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
