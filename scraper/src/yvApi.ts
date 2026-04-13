import type { FailedRequest } from "@bible-mirror/types";
import { r2Get, r2Put } from "./r2";

const YV_API_BASE = "https://api.youversion.com";
const YV_APP_KEY = process.env.YV_APP_KEY!;

export const SESSION_REQUEST_BUDGET = 900;
let sessionRequestCount = 0;

export function getSessionRequestCount(): number {
  return sessionRequestCount;
}

export function isSessionBudgetExhausted(): boolean {
  return sessionRequestCount >= SESSION_REQUEST_BUDGET;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response | null> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, {
        headers: {
          "X-YVP-App-Key": YV_APP_KEY,
          Accept: "application/json",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 60);
        console.warn(`[429] Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        attempt++;
        continue;
      }
      if (res.status >= 500) {
        const wait = Math.pow(2, attempt) * 2000;
        console.warn(`[${res.status}] Server error. Retry in ${wait}ms...`);
        await sleep(wait);
        attempt++;
        continue;
      }
      sessionRequestCount++;
      return res;
    } catch (err) {
      const wait = Math.pow(2, attempt) * 2000;
      console.warn(`[Network error] attempt ${attempt + 1}. Retry in ${wait}ms...`, err);
      await sleep(wait);
      attempt++;
    }
  }
  return null;
}

export async function yvFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T | null> {
  const url = new URL(`${YV_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetchWithRetry(url.toString());
  if (!res) {
    await recordFailure(url.toString(), path);
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[${res.status}] Failed: ${url}`);
    await recordFailure(url.toString(), path);
    return null;
  }
  return (await res.json()) as T;
}

export async function yvFetchAll<T>(
  path: string,
  params: Record<string, string | number> = {},
  pageSize = 100
): Promise<T[]> {
  const results: T[] = [];
  let pageToken: string | undefined;
  do {
    if (isSessionBudgetExhausted()) break;
    const qp: Record<string, string | number> = { ...params, page_size: pageSize };
    if (pageToken) qp.page_token = pageToken;
    const page = await yvFetch<{ data: T[]; next_page_token?: string }>(path, qp);
    if (!page) break;
    results.push(...page.data);
    pageToken = page.next_page_token;
  } while (pageToken);
  return results;
}

const FAILED_KEY = "state/failed-requests.json";

async function recordFailure(url: string, r2Key: string): Promise<void> {
  const existing = (await r2Get<FailedRequest[]>(FAILED_KEY)) ?? [];
  const idx = existing.findIndex((f) => f.url === url);
  const entry: FailedRequest = {
    url,
    r2_key: r2Key,
    attempts: idx >= 0 ? existing[idx].attempts + 1 : 1,
    last_error: "max retries exhausted",
    last_attempt: new Date().toISOString(),
  };
  if (idx >= 0) existing[idx] = entry;
  else existing.push(entry);
  await r2Put(FAILED_KEY, existing);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
