import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse, errorResponse } from "../response";

// ============================================================
// Bible Routes — /api/v1/bibles/*
// ============================================================

export const bibles = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// GET /bibles — list all bibles
bibles.get("/", async (c) => {
  const obj = await c.env.BIBLE_BUCKET.get("v1/bibles.json");
  if (!obj) return errorResponse(c as any, "NOT_FOUND", "Bible list not found.", 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId — single bible metadata
bibles.get("/:bibleId", async (c) => {
  const { bibleId } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Bible ${bibleId} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/books — list books for a bible
bibles.get("/:bibleId/books", async (c) => {
  const { bibleId } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/books.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Books for bible ${bibleId} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/books/:bookUsfm — single book detail
bibles.get("/:bibleId/books/:bookUsfm", async (c) => {
  const { bibleId, bookUsfm } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/books/${bookUsfm}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Book ${bookUsfm} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/books/:bookUsfm/chapters — list chapters for a book
bibles.get("/:bibleId/books/:bookUsfm/chapters", async (c) => {
  const { bibleId, bookUsfm } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/books/${bookUsfm}/chapters.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Chapters for ${bookUsfm} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/chapters/:chapterUsfm — single chapter detail
bibles.get("/:bibleId/chapters/:chapterUsfm", async (c) => {
  const { bibleId, chapterUsfm } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/chapters/${chapterUsfm}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Chapter ${chapterUsfm} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/chapters/:chapterUsfm/verses — list verses for a chapter
bibles.get("/:bibleId/chapters/:chapterUsfm/verses", async (c) => {
  const { bibleId, chapterUsfm } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/chapters/${chapterUsfm}/verses.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Verses for ${chapterUsfm} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/verses/:verseUsfm — single verse text
bibles.get("/:bibleId/verses/:verseUsfm", async (c) => {
  const { bibleId, verseUsfm } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/verses/${verseUsfm}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Verse ${verseUsfm} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/passages/:reference — full passage/chapter text
bibles.get("/:bibleId/passages/:reference", async (c) => {
  const { bibleId, reference } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/passages/${reference}.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Passage ${reference} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});

// GET /bibles/:bibleId/index — bible structure index
bibles.get("/:bibleId/index", async (c) => {
  const { bibleId } = c.req.param();
  const obj = await c.env.BIBLE_BUCKET.get(`v1/bibles/${bibleId}/index.json`);
  if (!obj) return errorResponse(c as any, "NOT_FOUND", `Index for bible ${bibleId} not found.`, 404);
  const data = await obj.json();
  return successResponse(c as any, data);
});
