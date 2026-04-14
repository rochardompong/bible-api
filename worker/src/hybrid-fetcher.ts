import { Context } from 'hono'
import { Env } from './index'

export const YOUVERSION_BASE = 'https://yv-api.youversionapi.com/3'

export async function fetchWithFallback(
  c: Context<{ Bindings: Env }>,
  cacheKey: string,
  youversionPath: string
): Promise<Response> {
  const bucket = c.env.BIBLE_CACHE
  const apiKey = c.env.YOUVERSION_API_KEY

  // 1. Check R2 Cache
  if (bucket) {
    try {
      const cached = await bucket.get(cacheKey)
      if (cached) {
        // Analytics tracking for cache hit
        if (c.env.ANALYTICS) {
          c.env.ANALYTICS.writeDataPoint({
            blobs: ['cache_hit', youversionPath],
            doubles: [1]
          })
        }

        const headers = new Headers()
        cached.writeHttpMetadata(headers)
        headers.set('etag', cached.httpEtag)
        headers.set('X-Cache-Status', 'HIT')
        return new Response(cached.body, { headers })
      }
    } catch (err) {
      console.error('R2 read error:', err)
      // Continue to fallback on error
    }
  }

  // Analytics tracking for cache miss
  if (c.env.ANALYTICS) {
    c.env.ANALYTICS.writeDataPoint({
      blobs: ['cache_miss', youversionPath],
      doubles: [1]
    })
  }

  // 2. Fallback to YouVersion API
  const fallbackUrl = `${YOUVERSION_BASE}${youversionPath}`
  
  if (!apiKey) {
    return createErrorResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'API Key not configured')
  }

  try {
    const response = await fetch(fallbackUrl, {
      headers: {
        'Accept': 'application/json',
        'X-YouVersion-Client': 'youversion',
        'X-YouVersion-App-Platform': 'web',
        'X-YouVersion-App-Version': '1',
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        return createErrorResponse(c, 429, 'RATE_LIMIT_EXCEEDED', 'YouVersion API limit reached', 30)
      }
      if (response.status === 404) {
        return createErrorResponse(c, 404, 'NOT_FOUND', 'Resource not found')
      }
      return createErrorResponse(c, 502, 'BAD_GATEWAY', 'Failed to fetch from Upstream')
    }

    // Clone response to cache it
    const dataToCache = await response.clone().text()
    
    // Asynchronously save to R2 to not block the request
    if (bucket) {
      c.executionCtx.waitUntil(
        bucket.put(cacheKey, dataToCache, {
          httpMetadata: { contentType: 'application/json' }
        })
      )
    }

    const res = new Response(dataToCache, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': 'MISS'
      }
    })

    return res

  } catch (err) {
    console.error('Fetch fallback error:', err)
    return createErrorResponse(c, 504, 'GATEWAY_TIMEOUT', 'Upstream timeout or network error')
  }
}

export function createErrorResponse(
  c: Context, 
  status: number, 
  code: string, 
  message: string, 
  retryAfter?: number
) {
  const errorObj: any = {
    code,
    message
  }
  if (retryAfter) {
    errorObj.retryAfter = retryAfter
  }

  return c.json({
    data: null,
    meta: {
      error: errorObj
    }
  }, status as any)
}
