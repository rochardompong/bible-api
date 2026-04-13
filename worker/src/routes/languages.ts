import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse, errorResponse } from "../response";
import { fetchFromR2 } from "../r2fetch";
import { keyLanguages, keyLanguage } from "../r2keys";

const languages = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

languages.get("/", async (c) => {
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyLanguages(), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", "Language list not yet available.", 503);
  return successResponse(c, r.data, { cached: r.cached });
});

languages.get("/:langId", async (c) => {
  const { langId } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyLanguage(langId), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Language '${langId}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

export { languages };
