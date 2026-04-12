# Bible Mirror

Automated YouVersion Bible scraper + personal API endpoint built on **GitHub Actions** + **Cloudflare R2** + **Cloudflare Workers**. 100% free tier.

---

## Architecture

```
GitHub Actions (cron: every 8h)
        │
        │  scraper/  (TypeScript + Node.js)
        │  • Reads progress from R2
        │  • Fetches YouVersion API (~900 req/session)
        │  • Writes JSON files to R2 mirroring YV URL structure
        │  • Writes progress back to R2
        ▼
Cloudflare R2 (storage)
   v1/bibles.json
   v1/bibles/{id}.json
   v1/bibles/{id}/books.json
   v1/bibles/{id}/books/{book}.json
   v1/bibles/{id}/chapters/{chapter}.json
   v1/bibles/{id}/verses/{verse}.json
   v1/bibles/{id}/passages/{ref}.json
   v1/bibles/{id}/index.json
   v1/languages.json
   v1/languages/{id}.json
   v1/verse-of-the-days/{year}.json
   v1/verse-of-the-days/{year}/{day}.json
   state/progress.json
   state/selected-bibles.json
   state/failed-requests.json
        │
        │  worker/  (Cloudflare Workers)
        │  • Auth: X-API-Key header
        │  • Routes /v1/* → R2 key → JSON response
        │  • Edge caching (24h)
        │  • CORS enabled
        ▼
Your Android/iOS App
```

---

## Scraping Timeline

| Phase | Data | Est. Sessions | Est. Time |
|-------|------|--------------|-----------|
| 0 | Bible list + select 50 | 1 | Day 1 |
| 1 | Languages | 1 | Day 1 |
| 2 | Bible metadata | 1 | Day 1 |
| 3 | VOTD calendars | 1 | Day 1 |
| 4 | Books (all 50 bibles) | 1–2 | Day 1–2 |
| 5 | Chapters | 5–10 | Week 1 |
| 6 | Verse lists | 10–20 | Week 2–3 |
| 7 | Verse text + passages | 500–1000+ | Month 1–3 |

> Rate limit: 1,000 req/hour → ~900 req/session × 3 sessions/day = 2,700 req/day

---

## Setup

### 1. Cloudflare R2

1. Create an R2 bucket named `bible-mirror` in your Cloudflare dashboard
2. Create an R2 API token with **Object Read & Write** permissions
3. Note your **Account ID**, **Access Key ID**, and **Secret Access Key**

### 2. GitHub Secrets

In your repo → Settings → Secrets → Actions, add:

| Secret | Value |
|--------|-------|
| `YV_APP_KEY` | Your YouVersion Platform API key |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Access Key |
| `R2_BUCKET_NAME` | `bible-mirror` (or your bucket name) |

### 3. Cloudflare Worker

```bash
cd worker
pnpm install

# Set your API secret key (used in X-API-Key header)
npx wrangler secret put API_SECRET_KEY

# Deploy
pnpm deploy
```

Update `wrangler.toml` → `bucket_name` to match your R2 bucket name.

### 4. First Run

Trigger the scraper manually via GitHub Actions → "Bible Mirror Scraper" → "Run workflow".

Or push to main and wait for the next cron (0:00, 8:00, 16:00 UTC).

---

## API Reference

**Base URL:** `https://bible-mirror-api.<your-subdomain>.workers.dev`

**Auth:** All requests require `X-API-Key: <your-secret>` header (except `/health`).

### Endpoints

```
GET /health                                    — no auth required
GET /                                          — endpoint index
GET /state/progress                            — scraping progress
GET /state/selected-bibles                     — list of 50 selected bibles

GET /v1/bibles                                 — all 50 bibles
GET /v1/bibles/:id                             — single bible
GET /v1/bibles/:id/books                       — books in a bible
GET /v1/bibles/:id/books/:book_usfm            — single book
GET /v1/bibles/:id/chapters/:chapter_usfm      — single chapter metadata
GET /v1/bibles/:id/chapters?book_usfm=GEN      — chapters in a book
GET /v1/bibles/:id/verses/:verse_usfm          — single verse with text
GET /v1/bibles/:id/verses?chapter_usfm=GEN.1   — verse list for a chapter
GET /v1/bibles/:id/passages/:usfm_reference    — passage/chapter text
GET /v1/bibles/:id/index                       — full bible index

GET /v1/languages                              — all languages
GET /v1/languages/:id                          — single language

GET /v1/verse-of-the-days/:year                — full VOTD calendar
GET /v1/verse-of-the-days/:year/:day           — single VOTD (day 1–366)
```

### Example Request (Android/iOS)

```kotlin
// Kotlin / Android
val client = OkHttpClient()
val request = Request.Builder()
    .url("https://bible-mirror-api.<subdomain>.workers.dev/v1/bibles/111/verses/JHN.3.16")
    .header("X-API-Key", BuildConfig.BIBLE_API_KEY)
    .build()
```

```swift
// Swift / iOS
var request = URLRequest(url: URL(string: "https://bible-mirror-api.<subdomain>.workers.dev/v1/bibles/111/verses/JHN.3.16")!)
request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
```

---

## Monitoring

- Check scraping progress: `GET /state/progress`
- Failed requests log: stored in R2 at `state/failed-requests.json`
- View GitHub Actions logs for each session
- Manual reset: trigger workflow with `reset_progress: true`

---

## Tech Stack (all free tier)

| Service | Usage | Free Limit |
|---------|-------|-----------|
| GitHub Actions | Cron scraper (3×/day) | Unlimited for public repos |
| Cloudflare R2 | JSON file storage | 10 GB storage, 1M reads/month |
| Cloudflare Workers | API proxy | 100,000 req/day |

---

## Known Limitations / Technical Debt

- No per-user rate limiting on the Worker (planned for future)
- Verse text scraping takes 1–3 months to complete for 50 bibles
- `selected-bibles.json` can be manually edited in R2 to override bible selection
