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
 * Membedah teks polos dari YouVersion untuk mengekstrak array ayat yang terstruktur.
 * Menangani teks di mana angka ayat sering menyatu dengan kata pertama (misal: "1Now these are...")
 */
export function parseVersesFromText(rawContent: string): any[] {
  const verses: any[] = [];
  
  // Bersihkan tag HTML terlebih dahulu jika ada
  let cleanText = rawContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

  // Regex untuk memecah berdasarkan angka ayat.
  // Pola: (Mulai baris ATAU spasi) + (Angka) + (Spasi opsional) + (Teks sampai angka berikutnya atau akhir)
  const regex = /(?:^|\s)(\d+)\s*([\s\S]*?)(?=(?:\s\d+\s*[A-Za-z])|$)/g;
  
  let match;
  while ((match = regex.exec(cleanText)) !== null) {
    const verseNum = match[1];
    let verseText = match[2].trim();
    
    // Kadang YouVersion menyatukan angka dengan huruf pertama tanpa spasi (misal "1Now").
    // Jika regex menangkap "Now" sebagai bagian dari teks, itu sudah benar.
    // Pastikan tidak ada angka ayat yang tertinggal di awal teks
    verseText = verseText.replace(/^\d+\s*/, '');

    verses.push({
      id: verseNum,
      verseId: verseNum,
      content: verseText
    });
  }

  // Jika regex gagal menemukan pola ayat (misal teksnya tidak ada angka), kembalikan utuh
  if (verses.length === 0 && cleanText.trim().length > 0) {
    verses.push({
      id: "1",
      verseId: "1",
      content: cleanText.trim()
    });
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
    const separator = youversionPath.includes('?') ? '&' : '?';
    const fallbackUrl = `${YOUVERSION_BASE}${youversionPath}${separator}format=html`;
    
    const response = await fetch(fallbackUrl, {
      headers: {
        'Accept': 'application/json',
        'X-YVP-App-Key': apiKey
      }
    })

    if (!response.ok) {
       return createErrorResponse(c, response.status, 'UPSTREAM_ERROR', 'Failed to fetch from YouVersion')
    }

    const yvData: any = await response.json()
    let structuredVerses: any[] = []

    if (yvData.data && Array.isArray(yvData.data.verses) && yvData.data.verses.length > 0) {
      structuredVerses = yvData.data.verses.map((v: any) => ({
         id: v.id || v.verseId || '',
         verseId: v.id || v.verseId || '',
         content: v.content || v.text || ''
      }))
    } 
    else if (yvData.content || (yvData.data && yvData.data.content)) {
      const rawContent = yvData.content || yvData.data.content
      
      // Coba parse sebagai HTML jika ada tag span class="v" atau "verse" atau "yv-vlbl"
      if (rawContent.includes('class="v') || rawContent.includes('class="verse') || rawContent.includes('yv-v')) {
        // Parse HTML dengan regex yang lebih fleksibel
        const verseRegex = /<span class="(?:yv-vlbl|v|verse)"[^>]*>([\d-]+)<\/span>([\s\S]*?)(?=<span class="(?:yv-v|v|verse)"|$)/g;
        let match;
        while ((match = verseRegex.exec(rawContent)) !== null) {
          let number = match[1].trim();
          let content = match[2];
          content = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          if (content) {
            structuredVerses.push({ id: number, verseId: number, content: content });
          }
        }
      } 
      
      // Fallback jika tidak ada tag HTML verse: gunakan teks polos (menggunakan parseVersesFromText)
      if (structuredVerses.length === 0) {
        structuredVerses = parseVersesFromText(rawContent);
      }
      
      // Fallback Darurat: Jika semua gagal, jadikan satu ayat
      if (structuredVerses.length === 0) {
        structuredVerses = [{
          id: "1",
          verseId: "1",
          content: rawContent.replace(/<[^>]*>/g, '').trim() // Bersihkan tag HTML
        }]
      }
    }

    const finalData = { 
       data: structuredVerses,
       meta: { source: 'YouVersion-Parsed', fetched_at: new Date().toISOString() }
    };
    const finalJson = JSON.stringify(finalData);

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

