import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse } from "../response";

const user = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

user.get("/", async (c) => {
  const u = c.get("user");
  return successResponse(c, {
    uid: u.uid,
    email: u.email,
    name: u.name,
    picture: u.picture,
    email_verified: u.email_verified,
    sign_in_provider: u.firebase.sign_in_provider,
  });
});

export { user };
