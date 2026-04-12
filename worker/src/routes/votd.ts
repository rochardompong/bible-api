import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse, errorResponse } from "../response";

// ============================================================
// Verse of the Day Routes — /api/v1/votd/*
// ============================================================

export const votd = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// GET /votd/today — today's verse of the day
votd.get("/today", async (c) => {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000) + 1;

  const obj = await c.env.BIBLE_BUCKET.get(`v1/verse-of-the-days/${year}/${dayOfYear}.json`);
  if (!obj) {
    return errorResponse(c as any, "NOT_FOUND", `VOTD for today (day ${dayOfYear}) not found.`, 404);
  }
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /votd/:year — full year VOTD calendar
votd.get("/:year", async (c) => {
  const { year } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/verse-of-the-days/${year}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `VOTD for year ${year} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /votd/:year/:day — specific day VOTD
votd.get("/:year/:day", async (c) => {
  const { year, day } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/verse-of-the-days/${year}/${day}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `VOTD for ${year}/${day} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});
