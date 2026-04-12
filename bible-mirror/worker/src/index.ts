/**
 * Bible Mirror API — Cloudflare Worker
 *
 * Routes all /v1/* requests to the corresponding JSON file in R2.
 * Mirrors the YouVersion API URL structure exactly.
 *
 * Authentication: X-API-Key header required for all requests.
 */

export interface Env {
  BIBLE_BUCKET: R2Bucket;
  API_SECRET_KEY: string;
  API_VERSION: string;
  CACHE_TTL: string;
}

// ============================================================
// Auth
// ============================================================

function isAuthenticated(request: Request, env: Env): boolean {
  const apiKey = request.headers.get("X-API-Key");
  return apiKey === env.API_SECRET_KEY;
}

// ============================================================
// Route → R2 key mapping
//
// The URL path maps 1:1 to R2 keys by appending ".json".
// Example: GET /v1/bibles/111/books → R2 key: v1/bibles/111/books.json
//
// Special cases handled:
//   - /v1/bibles/{id}/chapters?book_usfm=GEN → v1/bibles/{id}/books/GEN/chapters.json
//   - /v1/bibles/{id}/verses?chapter_usfm=GEN.1 → v1/bibles/{id}/chapters/GEN.1/verses.json
//   - /v1/verse-of-the-days/{year}/{day} → v1/verse-of-the-days/{year}/{day}.json
// ============================================================

function resolveR2Key(pathname: string, searchParams: URLSearchParams): string | null {
  // Strip leading slash
  const path = pathname.replace(/^\//, "");

  // Special: chapters collection — may be filtered by book_usfm
  // GET /v1/bibles/{id}/chapters?book_usfm=GEN
  const chaptersMatch = path.match(/^v1\/bibles\/(\d+)\/chapters$/);
  if (chaptersMatch) {
    const bookUsfm = searchParams.get("book_usfm");
    if (bookUsfm) {
      return `v1/bibles/${chaptersMatch[1]}/books/${bookUsfm}/chapters.json`;
    }
    return null; // No book filter = not supported (too large)
  }

  // Special: verses collection — must be filtered by chapter_usfm
  // GET /v1/bibles/{id}/verses?chapter_usfm=GEN.1
  const versesMatch = path.match(/^v1\/bibles\/(\d+)\/verses$/);
  if (versesMatch) {
    const chapterUsfm = searchParams.get("chapter_usfm");
    if (chapterUsfm) {
      return `v1/bibles/${versesMatch[1]}/chapters/${chapterUsfm}/verses.json`;
    }
    return null;
  }

  // Default: direct path → R2 key with .json extension
  if (path.match(/^v1\//)) {
    return `${path}.json`;
  }

  return null;
}

// ============================================================
// Response helpers
// ============================================================

function jsonResponse(data: unknown, status = 200, cacheTtl = 86400): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${cacheTtl}`,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-API-Key, Content-Type",
      "X-Bible-Mirror": "1",
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message, status }, status, 0);
}

// ============================================================
// Main handler
// ============================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "X-API-Key, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only GET allowed
    if (request.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    // Health check — no auth needed
    if (url.pathname === "/health") {
      return jsonResponse({ status: "ok", version: env.API_VERSION }, 200, 0);
    }

    // Auth check for all other routes
    if (!isAuthenticated(request, env)) {
      return errorResponse("Unauthorized. Provide a valid X-API-Key header.", 401);
    }

    // Root info
    if (url.pathname === "/" || url.pathname === "") {
      return jsonResponse({
        name: "Bible Mirror API",
        version: env.API_VERSION,
        source: "YouVersion Platform API (mirrored)",
        endpoints: [
          "GET /v1/bibles",
          "GET /v1/bibles/:id",
          "GET /v1/bibles/:id/books",
          "GET /v1/bibles/:id/books/:book_id",
          "GET /v1/bibles/:id/chapters/:chapter_id",
          "GET /v1/bibles/:id/chapters?book_usfm=:book_usfm",
          "GET /v1/bibles/:id/verses/:verse_id",
          "GET /v1/bibles/:id/verses?chapter_usfm=:chapter_usfm",
          "GET /v1/bibles/:id/passages/:reference",
          "GET /v1/bibles/:id/index",
          "GET /v1/languages",
          "GET /v1/languages/:id",
          "GET /v1/verse-of-the-days/:year",
          "GET /v1/verse-of-the-days/:year/:day",
          "GET /state/progress",
          "GET /state/selected-bibles",
        ],
      });
    }

    // Progress inspection endpoints (no .json mapping needed)
    if (url.pathname === "/state/progress") {
      const obj = await env.BIBLE_BUCKET.get("state/progress.json");
      if (!obj) return errorResponse("Progress file not found", 404);
      const data = await obj.json();
      return jsonResponse(data, 200, 0); // no cache for state
    }

    if (url.pathname === "/state/selected-bibles") {
      const obj = await env.BIBLE_BUCKET.get("state/selected-bibles.json");
      if (!obj) return errorResponse("Selected bibles file not found", 404);
      const data = await obj.json();
      return jsonResponse(data);
    }

    // Resolve R2 key from URL path
    const r2Key = resolveR2Key(url.pathname, url.searchParams);

    if (!r2Key) {
      return errorResponse(
        "Route not found or missing required query parameter (e.g. book_usfm or chapter_usfm)",
        404
      );
    }

    // Fetch from R2
    const cacheTtl = parseInt(env.CACHE_TTL ?? "86400", 10);

    // Use Cloudflare cache API for edge caching
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const object = await env.BIBLE_BUCKET.get(r2Key);

    if (!object) {
      return errorResponse(
        `Data not yet available for this resource. Check /state/progress for scraping status.`,
        404
      );
    }

    const data = await object.json();
    const response = jsonResponse(data, 200, cacheTtl);

    // Store in edge cache
    await cache.put(cacheKey, response.clone());

    return response;
  },
};
