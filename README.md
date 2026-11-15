# Media Hub (GitHub Actions + Pixeldrain + Next.js)

## 1. GitHub
- Push this repo to a **private** GitHub repo.
- Settings → Secrets and variables → Actions → add:
  - `PIXELDRAIN_API_KEY`
  - `YT_COOKIES` (optional, Netscape cookies.txt text, for sites that block datacenter IPs)
- Create a fine-grained token (this repo only, **Actions: Read and write**).

## 2. Vercel (or local)
- Import repo, **Root Directory = web**
- Env vars: GITHUB_TOKEN, GITHUB_REPO (user/repo), GITHUB_REF (main), PIXELDRAIN_API_KEY, DASHBOARD_PASSWORD
- Local: cd web && cp .env.local.example .env.local && npm install && npm run dev

## Flow
Scan → Actions job writes job-<id>.json to Pixeldrain → dashboard reads and deletes it.
Process → Actions downloads (yt-dlp) → FFmpeg → uploads out-<id>-<n>-<title>.mp4 → Library.
Edit → Actions pulls the Pixeldrain file → FFmpeg → uploads a new copy.
Play streams through /api/stream (Range supported). Download goes direct from Pixeldrain.
