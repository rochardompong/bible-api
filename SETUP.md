# Bible Mirror — Setup Guide

## Struktur Lengkap Project

```
bible-mirror/
├── .gitignore
├── .github/
│   └── workflows/
│       └── scraper.yml          ← GitHub Actions, cron 0/8/16 UTC
├── package.json                 ← root monorepo
├── pnpm-workspace.yaml          ← mendaftarkan scraper, worker, types
│
├── types/
│   ├── package.json             ← @bible-mirror/types
│   └── index.ts                 ← semua shared TypeScript types
│
├── scraper/                     ← dijalankan GitHub Actions (BUKAN di-deploy manual)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             ← entry point + orchestrator
│       ├── phases.ts            ← 8 fase scraping
│       ├── yvApi.ts             ← YouVersion API client + retry
│       ├── r2.ts                ← Cloudflare R2 client
│       └── progress.ts          ← state manager
│
├── worker/                      ← di-deploy ke Cloudflare Workers
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.ts             ← Hono app, semua route
│       ├── types.ts             ← Env, FirebaseUser
│       ├── firebase.ts          ← JWT verifier via JWKS
│       ├── response.ts          ← envelope { ok, data, meta }
│       ├── r2fetch.ts           ← R2 reader + edge cache
│       ├── r2keys.ts            ← key resolver
│       ├── middleware/
│       │   └── auth.ts          ← Firebase auth middleware
│       └── routes/
│           ├── bibles.ts
│           ├── languages.ts
│           ├── votd.ts
│           └── user.ts
│
└── examples/
    ├── android/
    │   └── BibleApiClient.kt
    └── ios/
        └── BibleApiClient.swift
```

---

## Prasyarat

- Node.js 22: https://nodejs.org
- pnpm 10: `npm install -g pnpm@10`
- Akun GitHub
- Akun Cloudflare (gratis)
- API key YouVersion: https://developers.youversion.com

---

## Langkah 1 — Upload ke GitHub

```bash
cd bible-mirror
git init
git add .
git commit -m "init: bible-mirror v2"
```

Buat repo baru di https://github.com/new, lalu:

```bash
git remote add origin https://github.com/USERNAME/bible-mirror.git
git branch -M main
git push -u origin main
```

---

## Langkah 2 — Buat R2 Bucket di Cloudflare

1. Login ke https://dash.cloudflare.com
2. Klik **R2 Object Storage** → **Create bucket**
3. Nama bucket: `bible-mirror` → Create
4. Buat R2 API Token:
   - R2 → **Manage R2 API Tokens** → **Create API Token**
   - Permission: **Object Read & Write**
   - Scope: bucket `bible-mirror`
   - Salin: **Account ID**, **Access Key ID**, **Secret Access Key**

---

## Langkah 3 — Tambahkan GitHub Secrets

Repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Nilai |
|--------|-------|
| `YV_APP_KEY` | API key YouVersion |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `R2_BUCKET_NAME` | `bible-mirror` |

---

## Langkah 4 — Setup Firebase

1. Buka https://console.firebase.google.com
2. **Add project** → nama `bible-mirror` → Create
3. **Authentication** → **Get started**
4. Aktifkan: **Google** dan **Email/Password**
5. **Project Settings** → catat **Project ID**

---

## Langkah 5 — Deploy Cloudflare Worker

```bash
# Install semua dependencies
pnpm install

# Masuk folder worker
cd worker

# Login ke Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put FIREBASE_PROJECT_ID
# → ketik Project ID dari Firebase, Enter

npx wrangler secret put API_SECRET_KEY
# → ketik string acak (misal: openssl rand -base64 32), Enter

# Deploy
pnpm deploy
```

Catat URL yang muncul:
`https://bible-mirror-api.<subdomain>.workers.dev`

Ganti `<your-subdomain>` di file:
- `examples/android/BibleApiClient.kt` → `BASE_URL`
- `examples/ios/BibleApiClient.swift` → `baseURL`

---

## Langkah 6 — Jalankan Scraper

GitHub repo → **Actions** → **Bible Mirror Scraper** → **Run workflow** → **Run workflow**

Cek progress:
```bash
curl https://bible-mirror-api.<subdomain>.workers.dev/state/progress \
  -H "X-API-Key: <API_SECRET_KEY>"
```

---

## Verifikasi

```bash
# Health check (tanpa auth)
curl https://bible-mirror-api.<subdomain>.workers.dev/health

# Test dengan Firebase token dari app
curl https://bible-mirror-api.<subdomain>.workers.dev/api/v1/ping \
  -H "Authorization: Bearer <firebase-id-token>"
```

---

## Perintah Penting

```bash
pnpm install              # install semua deps dari root
pnpm scraper:build        # build scraper
pnpm scraper:run          # jalankan scraper lokal
pnpm worker:dev           # dev Worker lokal
pnpm worker:deploy        # deploy Worker ke Cloudflare
cd worker && npx wrangler tail  # stream log live
```
