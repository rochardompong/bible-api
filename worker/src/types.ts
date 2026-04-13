export interface Env {
  BIBLE_BUCKET: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  API_SECRET_KEY: string;
  API_VERSION: string;
  CACHE_TTL: string;
  JWKS_CACHE_TTL: string;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
  firebase: { sign_in_provider: string };
}

export type ContextVariables = {
  user: FirebaseUser;
};
