import type { Context } from "hono";
import type { Env, ContextVariables } from "./types";

export type ErrorCode = "UNAUTHORIZED"|"FORBIDDEN"|"NOT_FOUND"|"DATA_NOT_READY"|"BAD_REQUEST"|"METHOD_NOT_ALLOWED"|"INTERNAL_ERROR";

export interface ApiMeta { cached: boolean; timestamp: string; version: string; }
export interface ApiSuccess<T> { ok: true; data: T; meta: ApiMeta; }
export interface ApiError { ok: false; error: { code: ErrorCode; message: string; status: number }; }

type Ctx = Context<{ Bindings: Env; Variables: ContextVariables }>;

export function successResponse<T>(c: Ctx, data: T, opts: { status?: number; cached?: boolean } = {}): Response {
  const { status = 200, cached = false } = opts;
  const cacheTtl = parseInt(c.env.CACHE_TTL ?? "86400", 10);
  const body: ApiSuccess<T> = {
    ok: true, data,
    meta: { cached, timestamp: new Date().toISOString(), version: c.env.API_VERSION ?? "2" },
  };
  return c.json(body, status, {
    "Cache-Control": cached ? `public, max-age=${cacheTtl}` : "no-store",
    "Access-Control-Allow-Origin": "*",
    "X-Bible-Mirror": c.env.API_VERSION ?? "2",
  });
}

export function errorResponse(c: Ctx, code: ErrorCode, message: string, status: number): Response {
  const body: ApiError = { ok: false, error: { code, message, status } };
  return c.json(body, status, { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
}
