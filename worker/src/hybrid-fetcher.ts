import { Context } from 'hono'
import { Env } from './index'

export const YOUVERSION_BASE = 'https://api.youversion.com/v1'

export function shouldTrack(eventType: string): boolean {
  const rand = Math.random()
  switch (eventType) {
    case 'cache_hit':
    case 'cache_miss':    return rand < 0.10  // 10% sampling
    case 'chapter_opened': return rand < 0.20  // 20% sampling
    default:               return true         // 100% for others
  }
}

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
        if (c.env.ANALYTICS && shouldTrack('cache_hit')) {
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
  if (c.env.ANALYTICS && shouldTrack('cache_miss')) {
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
        'X-YVP-App-Key': apiKey
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

/**
 * Membedah HTML dari YouVersion untuk mengekstrak array ayat yang terstruktur.
 */
export function parseVersesFromHtml(html: string): any[] {
  const verses: any[] = [];
  
  // Mencari semua span dengan class "v" (nomor ayat) dan teks setelahnya
  // Format khas YV: <span class="v">1</span><span class="content">Teks...</span>
  // Atau versi modern: <span class="verse" data-usfm="...">
  
  // 1. Ekstrak nomor ayat dan konten
  // Gunakan regex yang cukup luwes untuk menangkap berbagai variasi class penanda ayat
  const verseRegex = /<span class="(?:v|verse)"[^>]*>([\d-]+)<\/span>([\s\S]*?)(?=<span class="(?:v|verse)"|$)/g;
  
  let match;
  while ((match = verseRegex.exec(html)) !== null) {
    const number = match[1].trim();
    let content = match[2];
    
    // Bersihkan konten dari sisa tag HTML
    content = content.replace(/<[^>]*>/g, '') // Hapus tag
                     .replace(/&nbsp;/g, ' ') // Ganti spasi entitas
                     .replace(/\s+/g, ' ')    // Normalisasi spasi
                     .trim();
    
    if (content) {
      verses.push({
        id: number, // Sebagai ID lokal dalam array
        verseId: number,
        content: content
      });
    }
  }

  return verses;
}

/**
 * Fungsi khusus untuk mengambil perikop/pasal dan mengubahnya menjadi format terstruktur
 */
export async function fetchPassageAndParse(
  c: Context<{ Bindings: Env }>,
  cacheKey: string,
  youversionPath: string
): Promise<Response> {
  const bucket = c.env.BIBLE_CACHE
  const apiKey = c.env.YOUVERSION_API_KEY

  // 1. Cek R2 Cache (Sama seperti fetchWithFallback)
  if (bucket) {
    const cached = await bucket.get(cacheKey)
    if (cached) {
      const headers = new Headers()
      cached.writeHttpMetadata(headers)
      headers.set('X-Cache-Status', 'HIT')
      return new Response(cached.body, { headers })
    }
  }

  if (!apiKey) {
    return createErrorResponse(c, 500, 'INTERNAL_SERVER_ERROR', 'API Key not configured')
  }

  try {
    // 2. Fallback ke YouVersion dengan minta format HTML
    const fallbackUrl = `${YOUVERSION_BASE}${youversionPath}`
    const response = await fetch(fallbackUrl, {
      headers: {
        'Accept': 'text/html', // Minta HTML agar bisa diparse
        'X-YVP-App-Key': apiKey
      }
    })

    if (!response.ok) {
       return createErrorResponse(c, response.status, 'UPSTREAM_ERROR', 'Failed to fetch from YouVersion')
    }

    const html = await response.text();
    
    // 3. Bedah HTML menjadi JSON Terstruktur
    const structuredVerses = parseVersesFromHtml(html);
    const finalData = { 
       data: structuredVerses,
       meta: { source: 'YouVersion-Parsed', fetched_at: new Date().toISOString() }
    };
    const finalJson = JSON.stringify(finalData);

    // 4. Simpan ke R2 secara permanen
    if (bucket) {
      c.executionCtx.waitUntil(
        bucket.put(cacheKey, finalJson, { httpMetadata: { contentType: 'application/json' } })
      )
    }

    return new Response(finalJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': 'MISS'
      }
    });

  } catch (err) {
    console.error('Fetch and Parse error:', err)
    return createErrorResponse(c, 504, 'GATEWAY_TIMEOUT', 'Parsing failed or Upstream timeout')
  }
}

