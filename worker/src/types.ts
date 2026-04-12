// ============================================================
// Worker Environment & Context Types
// ============================================================

export interface Env {
  // R2 bucket binding
  BIBLE_BUCKET: R2Bucket;

  // Environment variables (from wrangler.toml [vars])
  API_VERSION: string;
  CACHE_TTL: string;
  JWKS_CACHE_TTL: string;

  // Secrets (set via `wrangler secret put`)
  FIREBASE_PROJECT_ID: string;
  API_SECRET_KEY: string;
}

export interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  iss: string;
  aud: string;
  auth_time: number;
  exp: number;
  iat: number;
  sub: string;
}

export interface ContextVariables {
  user: FirebaseUser;
}
