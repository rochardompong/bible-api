import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse, errorResponse } from "../response";
import { fetchFromR2 } from "../r2fetch";
import { keyVotdYear, keyVotdDay, getDayOfYear } from "../r2keys";

const votd = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

votd.get("/today", async (c) => {
  const { year, day } = getDayOfYear();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyVotdDay(year, day), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", `VOTD for today (day ${day} of ${year}) not yet available.`, 503);
  return successResponse(c, r.data, { cached: r.cached });
});

votd.get("/:year", async (c) => {
  const year = parseInt(c.req.param("year"));
  if (isNaN(year) || year < 2020 || year > 2100) {
    return errorResponse(c, "BAD_REQUEST", "Invalid year. Must be between 2020 and 2100.", 400);
  }
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyVotdYear(year), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", `VOTD calendar for ${year} not yet available.`, 503);
  return successResponse(c, r.data, { cached: r.cached });
});

votd.get("/:year/:day", async (c) => {
  const year = parseInt(c.req.param("year"));
  const day = parseInt(c.req.param("day"));
  if (isNaN(year) || year < 2020 || year > 2100) return errorResponse(c, "BAD_REQUEST", "Invalid year.", 400);
  if (isNaN(day) || day < 1 || day > 366) return errorResponse(c, "BAD_REQUEST", "Invalid day. Must be 1-366.", 400);
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyVotdDay(year, day), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `VOTD for day ${day} of ${year} not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

export { votd };
