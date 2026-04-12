import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Read a JSON object from R2. Returns null if the key does not exist.
 */
export async function r2Get<T>(key: string): Promise<T | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const res = await s3.send(cmd);
    const body = await res.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Write a JSON object to R2 with the given key.
 */
export async function r2Put(key: string, data: unknown): Promise<void> {
  const body = JSON.stringify(data, null, 2);
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: "application/json",
    CacheControl: "public, max-age=86400",
  });
  await s3.send(cmd);
}

/**
 * Check if a key already exists in R2 (avoids re-fetching already scraped data).
 */
export async function r2Exists(key: string): Promise<boolean> {
  try {
    const cmd = new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    await s3.send(cmd);
    return true;
  } catch {
    return false;
  }
}
