import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse, errorResponse } from "../response";

// ============================================================
// Language Routes — /api/v1/languages/*
// ============================================================

export const languages = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// GET /languages — list all languages
languages.get("/", async (c) => {
  const obj = await c.env.BIBLE_BUCKET.get("v1/languages.json");
  if (!obj) return errorResponse(c as any, "NOT_FOUND", "Languages not found.", 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /languages/:langId — single language detail
languages.get("/:langId", async (c) => {
  const { langId } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/languages/${langId}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Language ${langId} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});
