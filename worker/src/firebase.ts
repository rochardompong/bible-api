import type { FirebaseUser } from "./types";

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const JWKS_CACHE_SECONDS = 6 * 60 * 60;

interface JWK { kid: string; kty: string; alg: string; use: string; n: string; e: string; }

async function fetchJWKS(): Promise<JWK[]> {
  const cache = caches.default;
  const cacheKey = new Request(JWKS_URL);
  const cached = await cache.match(cacheKey);
  if (cached) return ((await cached.json()) as { keys: JWK[] }).keys;

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const data = (await res.json()) as { keys: JWK[] };

  await cache.put(cacheKey, new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${JWKS_CACHE_SECONDS}` },
  }));
  return data.keys;
}

async function importPublicKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<FirebaseUser> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64)));
  if (header.alg !== "RS256") throw new Error("Invalid algorithm: expected RS256");

  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("Token expired");
  if (typeof payload.iat !== "number" || payload.iat > now + 300) throw new Error("Token issued in the future");
  if (payload.aud !== projectId) throw new Error(`Invalid audience`);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Invalid issuer");
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("Missing subject (uid)");

  const keys = await fetchJWKS();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("No matching public key for kid: " + header.kid);

  const publicKey = await importPublicKey(jwk);
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlDecode(signatureB64);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signingInput);
  if (!valid) throw new Error("Invalid token signature");

  return {
    uid: payload.sub as string,
    email: (payload.email as string) ?? "",
    name: (payload.name as string) ?? "",
    picture: (payload.picture as string) ?? "",
    email_verified: (payload.email_verified as boolean) ?? false,
    firebase: { sign_in_provider: ((payload.firebase as Record<string, unknown>)?.sign_in_provider as string) ?? "unknown" },
  };
}
