import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createErrorResponse, fetchWithFallback, YOUVERSION_BASE } from './hybrid-fetcher'

export type Env = {
  BIBLE_CACHE: R2Bucket
  RATE_LIMIT_KV: KVNamespace
  ANALYTICS: AnalyticsEngineDataset
  APP_KEY: string
  YOUVERSION_API_KEY: string
  CF_ACCOUNT_ID: string
  CF_API_TOKEN: string
}

const app = new Hono<{ Bindings: Env }>()

// ==========================================
// MIDDLEWARES
// ==========================================

app.use('*', cors())

// 1. X-App-Key Protection
app.use('*', async (c, next) => {
  const appKey = c.env.APP_KEY
  if (appKey) { 
    const clientKey = c.req.header('X-App-Key')
    if (clientKey !== appKey) {
      return createErrorResponse(c, 401, 'UNAUTHORIZED', 'Invalid or missing X-App-Key')
    }
  }
  await next()
})

// 2. Rate Limiting via KV (Phase 2)
app.use('*', async (c, next) => {
  if (!c.env.RATE_LIMIT_KV) return next()
  
  // Skip admin paths from rate limiting
  if (c.req.path.startsWith('/admin')) return next()

  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1'
  const windowMinute = Math.floor(Date.now() / 60000)
  
  const isLazyEndpoint = c.req.path.includes('/verses') || c.req.path.includes('/passages')
  const group = isLazyEndpoint ? 'lazy' : 'preload'
  const limit = isLazyEndpoint ? 80 : 300

  const key = `ratelimit:${ip}:${group}:${windowMinute}`
  
  try {
    const current = await c.env.RATE_LIMIT_KV.get(key)
    const count = current ? parseInt(current) : 0
    if (count >= limit) {
      const waitSeconds = 60 - (Math.floor(Date.now() / 1000) % 60)
      return createErrorResponse(c, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests.', waitSeconds)
    }
    // Increment and set TTL 60 seconds to automatically expire
    await c.env.RATE_LIMIT_KV.put(key, (count + 1).toString(), { expirationTtl: 60 })
  } catch (err) {
    console.error('Rate limit KV error:', err)
  }
  
  await next()
})

// ==========================================
// ADMIN DASHBOARD ENDPOINTS (Data Control)
// ==========================================

app.get('/admin/r2/list', async (c) => {
  const prefix = c.req.query('prefix') || ''
  if (!c.env.BIBLE_CACHE) return c.json({ data: [] })
  const listed = await c.env.BIBLE_CACHE.list({ prefix })
  return c.json({
    data: listed.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }))
  })
})

app.get('/admin/r2/preview', async (c) => {
  const key = c.req.query('key')
  if (!key || !c.env.BIBLE_CACHE) return createErrorResponse(c, 400, 'BAD_REQUEST', 'Missing key')
  const obj = await c.env.BIBLE_CACHE.get(key)
  if (!obj) return createErrorResponse(c, 404, 'NOT_FOUND', 'Key not found in R2')
  const data = await obj.json()
  return c.json(data)
})

app.delete('/admin/r2/delete', async (c) => {
  const key = c.req.query('key')
  if (!key || !c.env.BIBLE_CACHE) return createErrorResponse(c, 400, 'BAD_REQUEST', 'Missing key')
  await c.env.BIBLE_CACHE.delete(key)
  return c.json({ data: { success: true, key } })
})

app.delete('/admin/r2/bulk-delete', async (c) => {
  const bibleId = c.req.query('bible_id')
  if (!bibleId || !c.env.BIBLE_CACHE) return createErrorResponse(c, 400, 'BAD_REQUEST', 'Missing bible_id')
  const prefix = `bibles/${bibleId}/`
  const listed = await c.env.BIBLE_CACHE.list({ prefix })
  const keys = listed.objects.map(o => o.key)
  if (keys.length > 0) {
    // Cloudflare R2 delete batching (up to 1000) - wait, R2 delete takes string or string[]
    // Actually `delete()` doesn't natively batch string[] in all runtime SDK versions, loop for safety.
    for (const k of keys) {
      await c.env.BIBLE_CACHE.delete(k)
    }
  }
  return c.json({ data: { success: true, deletedCount: keys.length } })
})

// ==========================================
// PHASE 3: ADVANCED ANALYTICS TELEMETRY
// ==========================================
// Endpoint for Flutter App to report client-side events like offline search and download completion
app.post('/analytics/track', async (c) => {
  if (!c.env.ANALYTICS) return c.json({ success: true, warning: "Analytics Engine not bound" })
  
  try {
    const body = await c.req.json()
    const eventType = body.event || 'unknown'
    const bibleId = body.bible_id || 'unknown'
    const query = body.query || ''
    const meta = body.meta || ''
    const value = body.value || 1
    
    // Log telemetry to Cloudflare Analytics Engine
    c.env.ANALYTICS.writeDataPoint({
      blobs: [eventType, bibleId, query, meta, 'mobile_client'], // 5 string indexes
      doubles: [value], // metric values
      indexes: [eventType]
    })
    
    return c.json({ success: true })
  } catch (err: any) {
    return createErrorResponse(c, 400, 'BAD_REQUEST', 'Invalid telemetry payload')
  }
})

// Query Analytics Engine via GraphQL
app.get('/admin/analytics', async (c) => {
  const accountId = c.env.CF_ACCOUNT_ID
  const apiToken = c.env.CF_API_TOKEN
  const type = c.req.query('type') || 'usage' 

  if (!accountId || !apiToken) {
    return createErrorResponse(c, 500, 'CONFIG_ERROR', 'Cloudflare Analytics credentials not configured.')
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();

  const queries: Record<string, string> = {
    usage: `
      query {
        viewer {
          accounts(filter: {accountTag: "${accountId}"}) {
            series: analyticsEngineDatasetAdaptiveGroups(
              limit: 100,
              filter: {
                dataset: "ANALYTICS",
                timestamp_gt: "${sevenDaysAgo}"
              },
              orderBy: [timestamp_DAY]
            ) {
              dimensions { datetime: timestamp_DAY }
              sum { doubles: double1 }
            }
          }
        }
      }
    `
  };

  const query = queries[type] || queries.usage;

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({ query })
    });

    const result: any = await res.json();
    return c.json({ data: result.data || result.errors });
  } catch (err: any) {
    return createErrorResponse(c, 502, 'GATEWAY_ERROR', 'Failed to fetch from Analytics Engine API')
  }
})

// ==========================================
// BIBLE API ENDPOINTS
// ==========================================

app.get('/', (c) => {
  return c.json({
    message: 'Hybrid Bible API Worker is running!',
    docs: 'Private endpoint.'
  })
})

app.get('/languages', (c) => fetchWithFallback(c, 'languages/index.json', '/languages'))

app.get('/bibles', (c) => fetchWithFallback(c, 'bibles/index.json', '/bibles'))

app.get('/bibles/:bible_id', (c) => {
  const { bible_id } = c.req.param()
  return fetchWithFallback(c, `bibles/${bible_id}.json`, `/bibles/${bible_id}`)
})

app.get('/bibles/:bible_id/index', async (c) => {
  const { bible_id } = c.req.param()
  const bucket = c.env.BIBLE_CACHE
  if (bucket) {
    const cached = await bucket.get(`bibles/${bible_id}/index.json`)
    if (cached) {
      const headers = new Headers()
      cached.writeHttpMetadata(headers)
      return new Response(cached.body, { headers })
    }
  }
  return createErrorResponse(c, 404, 'NOT_FOUND', 'Index not yet generated by scraper or not available.')
})

app.get('/bibles/:bible_id/books', (c) => {
  const { bible_id } = c.req.param()
  return fetchWithFallback(c, `bibles/${bible_id}/books.json`, `/bibles/${bible_id}/books`)
})

app.get('/bibles/:bible_id/books/:book_id', (c) => {
  const { bible_id, book_id } = c.req.param()
  return fetchWithFallback(c, `bibles/${bible_id}/books/${book_id}.json`, `/bibles/${bible_id}/books/${book_id}`)
})

app.get('/bibles/:bible_id/books/:book_id/chapters', (c) => {
  const { bible_id, book_id } = c.req.param()
  return fetchWithFallback(c, `bibles/${bible_id}/books/${book_id}/chapters.json`, `/bibles/${bible_id}/books/${book_id}/chapters`)
})

app.get('/bibles/:bible_id/chapters/:chapter_id', (c) => {
  const { bible_id, chapter_id } = c.req.param()
  return fetchWithFallback(c, `bibles/${bible_id}/chapters/${chapter_id}.json`, `/bibles/${bible_id}/chapters/${chapter_id}`)
})

// VERSES with Predictive Prefetch & Native Usage Analytics (Phase 3)
app.get('/bibles/:bible_id/chapters/:chapter_id/verses', (c) => {
  const { bible_id, chapter_id } = c.req.param()
  
  if (c.env.ANALYTICS) {
    c.env.ANALYTICS.writeDataPoint({
      blobs: ['usage', bible_id, chapter_id, 'verses_endpoint', 'worker_native'],
      doubles: [1],
      indexes: ['usage']
    })
  }
  
  // Phase 2: Predictive prefetch chapter N+1
  c.executionCtx.waitUntil((async () => {
    // Attempt parsing e.g. GEN.1 -> GEN.2
    const parts = chapter_id.split('.')
    if (parts.length >= 2) {
      const num = parseInt(parts[1])
      if (!isNaN(num)) {
        const nextChapterId = `${parts[0]}.${num + 1}`
        const nextCacheKey = `bibles/${bible_id}/chapters/${nextChapterId}/verses.json`
        
        if (c.env.BIBLE_CACHE) {
          const exists = await c.env.BIBLE_CACHE.head(nextCacheKey)
          if (!exists) {
            // It's missing in R2, fetch silently from upstream
            if (c.env.YOUVERSION_API_KEY) {
              try {
                const fetchRes = await fetch(`${YOUVERSION_BASE}/bibles/${bible_id}/chapters/${nextChapterId}/verses`, {
                  headers: {
                    'Accept': 'application/json',
                    'X-YVP-App-Key': c.env.YOUVERSION_API_KEY
                  }
                })
                if (fetchRes.ok) {
                  const text = await fetchRes.text()
                  await c.env.BIBLE_CACHE.put(nextCacheKey, text, {
                    httpMetadata: { contentType: 'application/json' }
                  })
                  console.log(`[PREFETCH] Cached ${nextCacheKey} successfully.`)
                }
              } catch (e) {
                console.error(`[PREFETCH ERROR] ${nextCacheKey}:`, e)
              }
            }
          }
        }
      }
    }
  })())

  return fetchWithFallback(c, `bibles/${bible_id}/chapters/${chapter_id}/verses.json`, `/bibles/${bible_id}/chapters/${chapter_id}/verses`)
})

app.get('/bibles/:bible_id/verses/:verse_id', async (c) => {
  const { bible_id, verse_id } = c.req.param()
  
  const parts = verse_id.split('.')
  let chapter_id = ''
  if (parts.length >= 3) {
    chapter_id = `${parts[0]}.${parts[1]}`
  }

  if (chapter_id && c.env.BIBLE_CACHE) {
    const chapterCacheKey = `bibles/${bible_id}/chapters/${chapter_id}/verses.json`
    const cachedChapter = await c.env.BIBLE_CACHE.get(chapterCacheKey)
    if (cachedChapter) {
      try {
        const chapterData: any = await cachedChapter.json()
        const versesList = chapterData?.data || chapterData?.verses || []
        const verse = versesList.find((v: any) => v.id === verse_id || v.reference === verse_id)
        if (verse) {
          return c.json({ data: verse })
        }
      } catch (e) {
        console.error('Error parsing chapter for verse extraction:', e)
      }
    }
  }

  return fetchWithFallback(c, `bibles/${bible_id}/verses/${verse_id}.json`, `/bibles/${bible_id}/verses/${verse_id}`)
})

app.get('/bibles/:bible_id/passages/:passage_id', (c) => {
  const { bible_id, passage_id } = c.req.param()
  return fetchWithFallback(c, `bibles/${bible_id}/passages/${passage_id}.json`, `/bibles/${bible_id}/passages/${passage_id}`)
})

app.get('/verse_of_the_day/:year', (c) => {
  const { year } = c.req.param()
  return fetchWithFallback(c, `verse_of_the_day/${year}.json`, `/verse_of_the_days?year=${year}`)
})

app.get('/verse_of_the_day/:year/:day', (c) => {
  const { year, day } = c.req.param()
  return fetchWithFallback(c, `verse_of_the_day/${year}/${day}.json`, `/verse_of_the_days/${day}?year=${year}`)
})

app.onError((err, c) => {
  console.error('Unhandled worker error:', err)
  return createErrorResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred')
})

export default app
