import type { Context } from "hono";
import type { Env, ContextVariables } from "./types";

type WorkerContext = Context<{ Bindings: Env; Variables: ContextVariables }>;

// ============================================================
// Standardized API Response Helpers
// ============================================================

interface SuccessBody {
  ok: true;
  data: unknown;
}

interface ErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Return a standard success JSON response.
 */
export function successResponse(c: WorkerContext, data: unknown, status: number = 200) {
  const body: SuccessBody = { ok: true, data };
  return c.json(body, status as any);
}

/**
 * Return a standard error JSON response.
 */
export function errorResponse(
  c: WorkerContext,
  code: string,
  message: string,
  status: number = 400
) {
  const body: ErrorBody = {
    ok: false,
    error: { code, message },
  };
  return c.json(body, status as any);
}
