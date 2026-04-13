import { Hono } from "hono";
import type { Env, ContextVariables } from "../types";
import { successResponse, errorResponse } from "../response";
import { fetchFromR2 } from "../r2fetch";
import { keyBibles, keyBible, keyBooks, keyBook, keyChapters, keyChapter, keyVerseList, keyVerse, keyPassage, keyIndex } from "../r2keys";

const bibles = new Hono<{ Bindings: Env; Variables: ContextVariables }>();
const NOT_READY = "Data not yet available. Check /state/progress for scraping status.";

bibles.get("/", async (c) => {
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyBibles(), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", NOT_READY, 503);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId", async (c) => {
  const { bibleId } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyBible(bibleId), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Bible '${bibleId}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/books", async (c) => {
  const { bibleId } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyBooks(bibleId), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Books for Bible '${bibleId}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/books/:bookUsfm", async (c) => {
  const { bibleId, bookUsfm } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyBook(bibleId, bookUsfm), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Book '${bookUsfm}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/books/:bookUsfm/chapters", async (c) => {
  const { bibleId, bookUsfm } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyChapters(bibleId, bookUsfm), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Chapters for '${bookUsfm}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/chapters/:chapterUsfm", async (c) => {
  const { bibleId, chapterUsfm } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyChapter(bibleId, chapterUsfm), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Chapter '${chapterUsfm}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/chapters/:chapterUsfm/verses", async (c) => {
  const { bibleId, chapterUsfm } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyVerseList(bibleId, chapterUsfm), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "NOT_FOUND", `Verse list for '${chapterUsfm}' not found.`, 404);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/verses/:verseUsfm", async (c) => {
  const { bibleId, verseUsfm } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyVerse(bibleId, verseUsfm), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", `Verse '${verseUsfm}' not yet available.`, 503);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/passages/:reference", async (c) => {
  const { bibleId, reference } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyPassage(bibleId, reference), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", `Passage '${reference}' not yet available.`, 503);
  return successResponse(c, r.data, { cached: r.cached });
});

bibles.get("/:bibleId/index", async (c) => {
  const { bibleId } = c.req.param();
  const r = await fetchFromR2(c.env.BIBLE_BUCKET, keyIndex(bibleId), parseInt(c.env.CACHE_TTL));
  if (!r) return errorResponse(c, "DATA_NOT_READY", `Index for Bible '${bibleId}' not yet available.`, 503);
  return successResponse(c, r.data, { cached: r.cached });
});

export { bibles };
