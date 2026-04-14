# Hybrid Bible API Endpoint

REST API hibrida untuk Alkitab berbasis Cloudflare Workers, R2 (Cache), dan GitHub Actions (Data Feeder). Proyek ini beroperasi sebagai proxy/cache layer yang kompatibel dengan format YouVersion API.

## 🚀 Struktur Monorepo (pnpm)

- `/worker` - Cloudflare Worker API (Hono)
- `/scraper` - GitHub Actions Node.js Script (Feeder R2)
- `/dashboard` - React Single Page Application (Admin Control)

---

## 🛠️ Persiapan Sebelum Deploy (Production)

Sebelum Anda melakukan `git push` dan *deploy* ke production, pastikan Anda melakukan 3 langkah krusial di ekosistem Cloudflare dan GitHub Anda:

### 1. Persiapan Cloudflare R2 & KV
Buka dashboard Cloudflare, navigasikan ke menu R2 dan KV, lalu buat:
1. **R2 Bucket** bernama `hybrid-bible-cache`.
2. **KV Namespace** bernama `RATE_LIMIT_KV`.
3. Buka file `worker/wrangler.toml` dan pastikan `id` pada `[[kv_namespaces]]` Anda ganti dengan ID namespace KV asli yang baru saja Anda buat.

### 2. Persiapan GitHub Actions Secrets
Buka halaman repository GitHub Anda: **Settings > Secrets and variables > Actions**.  
Tambahkan variabel rahasia berikut:
- `YOUVERSION_API_KEY`: Token Bearer akses ke API YouVersion
- `R2_ACCESS_KEY_ID`: Cloudflare R2 Access Key
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 Secret Key
- `R2_ENDPOINT`: URL S3 Endpoint R2 Anda (contoh: `https://<account_id>.r2.cloudflarestorage.com`)
- `R2_BUCKET_NAME`: `hybrid-bible-cache`

### 3. Deploy Worker (Cloudflare)
Masuk ke terminal di folder `/worker` dan jalankan:
```bash
npm install -g wrangler
wrangler deploy
```
Saat pertama kali deploy, atur secret key utama dengan perintah:
```bash
wrangler secret put APP_KEY
wrangler secret put YOUVERSION_API_KEY
```

### 4. Deploy Admin Dashboard
Deploy folder `/dashboard` ke **Cloudflare Pages** (Bisa langsung disambungkan ke repository GitHub ini secara otomatis).
- **Framework Preset**: Vite
- **Build Command**: `pnpm run build`
- **Build Directory**: `dist`
Pastikan Anda melindungi URL Cloudflare Pages ini di menu *Cloudflare Access* (Zero Trust).

---

Siap untuk melaju ke **Phase 3**!
