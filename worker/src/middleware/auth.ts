import type { MiddlewareHandler } from "hono";
import type { Env, ContextVariables } from "../types";
import { verifyFirebaseToken } from "../firebase";
import { errorResponse } from "../response";

export const firebaseAuth: MiddlewareHandler<{ Bindings: Env; Variables: ContextVariables }> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(c, "UNAUTHORIZED", "Missing or malformed Authorization header. Expected: Bearer <firebase-id-token>", 401);
  }
  const token = authHeader.slice(7);
  try {
    const user = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    c.set("user", user);
    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token verification failed";
    return errorResponse(c, "UNAUTHORIZED", message, 401);
  }
};
