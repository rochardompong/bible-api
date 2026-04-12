import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse } from "../response";

// ============================================================
// User Routes — /api/v1/me
// ============================================================

export const user = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// GET /me — return user info decoded from Firebase JWT (zero R2 calls)
user.get("/", (c) => {
  const u = c.get("user");
  return successResponse(c as any, {
    uid: u.uid,
    email: u.email ?? null,
    name: u.name ?? null,
    picture: u.picture ?? null,
    email_verified: u.email_verified ?? false,
  });
});
