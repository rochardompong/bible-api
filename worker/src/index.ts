import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env, ContextVariables } from "./types";
import { firebaseAuth } from "./middleware/auth";
import { successResponse, errorResponse } from "./response";
import { bibles } from "./routes/bibles";
import { languages } from "./routes/languages";
import { votd } from "./routes/votd";
import { user } from "./routes/user";

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

app.use("*", logger());
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type", "X-API-Key"],
  allowMethods: ["GET", "OPTIONS"],
  maxAge: 86400,
}));

// Public endpoints
app.get("/health", (c) =>
  c.json({ ok: true, status: "healthy", version: c.env.API_VERSION, timestamp: new Date().toISOString() })
);

app.get("/", (c) =>
  c.json({
    name: "Bible Mirror API",
    version: c.env.API_VERSION,
    auth: "Authorization: Bearer <firebase-id-token>",
    endpoints: {
      public: ["GET /health", "GET /"],
      authenticated: [
        "GET /api/v1/ping",
        "GET /api/v1/me",
        "GET /api/v1/bibles",
        "GET /api/v1/bibles/:bibleId",
        "GET /api/v1/bibles/:bibleId/books",
        "GET /api/v1/bibles/:bibleId/books/:bookUsfm",
        "GET /api/v1/bibles/:bibleId/books/:bookUsfm/chapters",
        "GET /api/v1/bibles/:bibleId/chapters/:chapterUsfm",
        "GET /api/v1/bibles/:bibleId/chapters/:chapterUsfm/verses",
        "GET /api/v1/bibles/:bibleId/verses/:verseUsfm",
        "GET /api/v1/bibles/:bibleId/passages/:reference",
        "GET /api/v1/bibles/:bibleId/index",
        "GET /api/v1/languages",
        "GET /api/v1/languages/:langId",
        "GET /api/v1/votd/today",
        "GET /api/v1/votd/:year",
        "GET /api/v1/votd/:year/:day",
      ],
      internal: ["GET /state/progress  (X-API-Key)", "GET /state/selected-bibles  (X-API-Key)"],
    },
  })
);

// Authenticated routes
const api = new Hono<{ Bindings: Env; Variables: ContextVariables }>();
api.use("*", firebaseAuth);

api.get("/ping", (c) => {
  const u = c.get("user");
  return successResponse(c, { pong: true, uid: u.uid, timestamp: new Date().toISOString() });
});

api.route("/me", user);
api.route("/bibles", bibles);
api.route("/languages", languages);
api.route("/votd", votd);

app.route("/api/v1", api);

// Internal state endpoints
app.get("/state/progress", async (c) => {
  if (c.req.header("X-API-Key") !== c.env.API_SECRET_KEY)
    return errorResponse(c, "UNAUTHORIZED", "X-API-Key required.", 401);
  const obj = await c.env.BIBLE_BUCKET.get("state/progress.json");
  if (!obj) return errorResponse(c, "NOT_FOUND", "Progress file not found.", 404);
  return c.json(await obj.json(), 200);
});

app.get("/state/selected-bibles", async (c) => {
  if (c.req.header("X-API-Key") !== c.env.API_SECRET_KEY)
    return errorResponse(c, "UNAUTHORIZED", "X-API-Key required.", 401);
  const obj = await c.env.BIBLE_BUCKET.get("state/selected-bibles.json");
  if (!obj) return errorResponse(c, "NOT_FOUND", "Selected bibles not found.", 404);
  return c.json(await obj.json(), 200);
});

app.notFound((c) => errorResponse(c, "NOT_FOUND", `Route '${c.req.path}' not found.`, 404));
app.onError((err, c) => {
  console.error("[Error]", err);
  return errorResponse(c, "INTERNAL_ERROR", "An unexpected error occurred.", 500);
});

export default app;
