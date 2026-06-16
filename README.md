# Yalla — Live Football Scores

A FotMob / LiveSoccerTV-style football site. No backend server: a scheduled
GitHub Action fetches data from **API-Football**, commits JSON into `/data`,
and a static **React + Vite** site (on GitHub Pages) reads that JSON.

```
scripts/fetch.mjs   Node script (no deps) → writes /data/*.json
data/               committed JSON = the "database" served from GitHub
.github/workflows/  fetch-data.yml (cron) + deploy.yml (Pages)
web/                React + Vite app
```

## Why this design (free plan reality)

API-Football's free plan allows **~100 requests/day**. You cannot poll the API
live from the browser (you'd burn the quota in minutes and leak your key). So:

- The cron Action spends the quota — visitors never hit the API.
- `fixtures?live=all` returns **all** live matches in **1 call**;
  `fixtures?date=YYYY-MM-DD` returns **all** leagues for a day in **1 call**.
- Live scores are "near-live": as fresh as the cron interval (~15 min), plus a
  few minutes of CDN cache. True per-minute updates need a paid plan.

Rough daily budget: 3 (yesterday/today/tomorrow fixtures) + 1 (leagues/seasons)
+ ~12 (standings) + ~48 (live poll, every 15 min, 11:00–22:00 UTC) ≈ **64/day**.

---

## 1. Get the API key

1. Sign up at https://dashboard.api-football.com/ and subscribe to the **Free** plan.
2. Copy your API key from the dashboard (the `x-apisports-key`).

## 2. Create the GitHub repo

```bash
cd /Volumes/Office/WebDev/YallaApp
git init -b main
git add .
git commit -m "Initial commit: Yalla football scores"
```

Create an empty repo on github.com (e.g. `yalla`), then:

```bash
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

## 3. Add the API key as a secret

Repo → **Settings → Secrets and variables → Actions → New repository secret**

- Name: `API_FOOTBALL_KEY`
- Value: *your key*

## 4. Point the site at your data + set Pages base

Add a repo **Variable** (same screen, "Variables" tab):

- Name: `VITE_DATA_BASE`
- Value: `https://raw.githubusercontent.com/<USER>/<REPO>/main/data`

Enable Pages: **Settings → Pages → Build and deployment → Source = GitHub Actions**.

## 5. Run the first fetch

Go to **Actions → "Fetch football data" → Run workflow → mode: all**.
It will commit JSON into `/data`. Then **Actions → "Deploy site" → Run workflow**
(or just push any change under `web/`). Your site appears at
`https://<USER>.github.io/<REPO>/`.

After that, the crons run automatically (live every 15 min during match hours,
full refresh daily at 06:05 UTC).

---

## Local development

```bash
cd web
npm install
npm run dev        # uses the sample JSON in web/public/data
```

To preview against your real GitHub data instead, create `web/.env.local`:

```
VITE_DATA_BASE=https://raw.githubusercontent.com/<USER>/<REPO>/main/data
```

Test the fetcher locally:

```bash
API_FOOTBALL_KEY=xxxx MODE=all node scripts/fetch.mjs
```

## Tuning

- **Coverage / standings:** edit `PRIORITY_LEAGUES` in `scripts/fetch.mjs`.
- **Refresh frequency / hours:** edit the `cron` lines in
  `.github/workflows/fetch-data.yml`. Keep total calls under ~100/day.
- **Data freshness in the UI:** `refreshMs` values in the React pages.

## Known limits (free plan)

- No per-match events / lineups / live stats at scale (1 API call each).
- Updates are delayed a few minutes, not real-time.
- TV-broadcast listings (LiveSoccerTV style) aren't in the free dataset.
