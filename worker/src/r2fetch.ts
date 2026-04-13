export async function fetchFromR2<T>(
  bucket: R2Bucket,
  key: string,
  cacheTtl: number
): Promise<{ data: T; cached: boolean } | null> {
  const cache = caches.default;
  const cacheUrl = `https://r2-cache.internal/${key}`;
  const cacheKey = new Request(cacheUrl);

  const cached = await cache.match(cacheKey);
  if (cached) return { data: (await cached.json()) as T, cached: true };

  const object = await bucket.get(key);
  if (!object) return null;

  const data = (await object.json()) as T;
  await cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${cacheTtl}` },
  }));
  return { data, cached: false };
}
