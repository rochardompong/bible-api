import type { MiddlewareHandler } from "hono";
import type { Env, ContextVariables, FirebaseUser } from "../types";
import { errorResponse } from "../response";

// ============================================================
// Firebase Auth Middleware — JWT verification via Google JWKS
// ============================================================

interface JWK {
  kty: string;
  kid: string;
  n: string;
  e: string;
  alg: string;
  use: string;
}

interface JWKSResponse {
  keys: JWK[];
}

interface JWTHeader {
  alg: string;
  kid: string;
  typ: string;
}

// Cache JWKS keys in memory (per-isolate)
let cachedKeys: JWKSResponse | null = null;
let cachedAt = 0;

const GOOGLE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

async function getJWKS(cacheTtl: number): Promise<JWKSResponse> {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < cacheTtl * 1000) {
    return cachedKeys;
  }

  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  cachedKeys = (await res.json()) as JWKSResponse;
  cachedAt = now;
  return cachedKeys;
}

function base64UrlDecode(str: string): ArrayBuffer {
  // Add padding
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function decodeJWTHeader(token: string): JWTHeader {
  const [header] = token.split(".");
  const decoded = new TextDecoder().decode(new Uint8Array(base64UrlDecode(header)));
  return JSON.parse(decoded);
}

function decodeJWTPayload(token: string): FirebaseUser {
  const parts = token.split(".");
  const decoded = new TextDecoder().decode(new Uint8Array(base64UrlDecode(parts[1])));
  return JSON.parse(decoded);
}

async function importKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: "RS256",
      ext: true,
    },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function verifyJWT(
  token: string,
  projectId: string,
  cacheTtl: number
): Promise<FirebaseUser> {
  const header = decodeJWTHeader(token);
  if (header.alg !== "RS256") throw new Error("Unsupported algorithm");

  const jwks = await getJWKS(cacheTtl);
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Signing key not found");

  const key = await importKey(jwk);
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = new Uint8Array(base64UrlDecode(signatureB64));

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
  if (!valid) throw new Error("Invalid signature");

  const payload = decodeJWTPayload(token);

  // Validate standard claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expired");
  if (payload.iat > now + 60) throw new Error("Token issued in the future");
  if (payload.aud !== projectId) throw new Error("Invalid audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`)
    throw new Error("Invalid issuer");
  if (!payload.sub || payload.sub.length === 0) throw new Error("Missing subject");

  return payload;
}

/**
 * Hono middleware: Extracts and verifies Firebase ID token from Authorization header.
 * Sets `c.set("user", firebaseUser)` on success.
 */
export const firebaseAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: ContextVariables;
}> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(
      c as any,
      "UNAUTHORIZED",
      "Missing or invalid Authorization header. Use: Bearer <firebase-id-token>",
      401
    );
  }

  const token = authHeader.slice(7);
  const cacheTtl = Number(c.env.JWKS_CACHE_TTL ?? 21600);

  try {
    const user = await verifyJWT(token, c.env.FIREBASE_PROJECT_ID, cacheTtl);
    c.set("user", user);
    await next();
  } catch (err: any) {
    return errorResponse(
      c as any,
      "UNAUTHORIZED",
      `Firebase auth failed: ${err.message}`,
      401
    );
  }
};
