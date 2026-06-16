#!/usr/bin/env node
// Fetches data from API-Football and writes JSON files into ../data
// Pure Node 18+ (uses global fetch). No dependencies.
//
// Required env: API_FOOTBALL_KEY
// Optional env: MODE = "live" | "daily" | "detail" | "all"  (default "all")
//
// API docs: https://www.api-football.com/documentation-v3
// Free plan ~100 requests/day. Expensive per-fixture calls (events, lineups,
// statistics, predictions) are fetched only for "featured" matches and stop
// automatically when the daily quota runs low.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const API_BASE = "https://v3.football.api-sports.io";
const KEY = process.env.API_FOOTBALL_KEY;
const MODE = (process.env.MODE || "all").toLowerCase();

if (!KEY) {
  console.error("ERROR: API_FOOTBALL_KEY env var is not set.");
  process.exit(1);
}

// Leagues we treat as "featured" (full detail + standings + top scorers).
const PRIORITY_LEAGUES = [
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  88,   // Eredivisie (Netherlands)
  94,   // Primeira Liga (Portugal)
  71,   // Brasileirao Serie A (Brazil)
  253,  // MLS (USA)
  203,  // Super Lig (Turkey)
  1,    // World Cup
];

const PRIORITY_SET = new Set(PRIORITY_LEAGUES);

// Stop spending expensive (per-fixture) calls once the daily quota drops here.
const MIN_REMAINING = 15;
// Cap featured matches per run so a busy day can't queue hundreds of calls.
const MAX_FEATURED = 30;

// --- tiny HTTP layer with quota tracking -----------------------------------

let dailyRemaining = Infinity;
const stats = { calls: 0 };

function canSpend() {
  return dailyRemaining > MIN_REMAINING;
}

async function api(path, params = {}) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { "x-apisports-key": KEY } });
  stats.calls++;

  const remDay = res.headers.get("x-ratelimit-requests-remaining");
  if (remDay != null) dailyRemaining = Number(remDay);

  if (!res.ok) throw new Error(`API ${res.status} for ${url.pathname}${url.search}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length)
    console.warn(`  ! API errors for ${path}:`, JSON.stringify(json.errors));
  return json.response || [];
}

// Wrap a task so one failing endpoint never aborts the whole run.
async function task(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.warn(`  task "${label}" failed: ${e.message}`);
    return null;
  }
}

async function save(name, payload) {
  await writeFile(join(DATA_DIR, name), JSON.stringify(payload), "utf8");
  console.log(`  wrote data/${name}`);
}

async function readData(name) {
  try {
    return JSON.parse(await readFile(join(DATA_DIR, name), "utf8"));
  } catch {
    return null;
  }
}

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const LIVE_SHORT = new Set(["1H", "2H", "ET", "P", "BT", "HT", "LIVE", "INT"]);
const DONE_SHORT = new Set(["FT", "AET", "PEN"]);

// --- normalizers ------------------------------------------------------------

function slimFixture(f) {
  return {
    id: f.fixture.id,
    date: f.fixture.date,
    timestamp: f.fixture.timestamp,
    status: f.fixture.status,
    venue: f.fixture.venue?.name,
    league: {
      id: f.league.id, name: f.league.name, country: f.league.country,
      logo: f.league.logo, flag: f.league.flag, round: f.league.round,
    },
    teams: {
      home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo, winner: f.teams.home.winner },
      away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo, winner: f.teams.away.winner },
    },
    goals: f.goals,
    score: f.score,
  };
}

const slimEvent = (e) => ({
  elapsed: e.time?.elapsed, extra: e.time?.extra,
  teamId: e.team?.id, team: e.team?.name,
  player: e.player?.name, assist: e.assist?.name,
  type: e.type, detail: e.detail, comments: e.comments,
});

const slimLineup = (l) => ({
  teamId: l.team?.id, team: l.team?.name, colors: l.team?.colors,
  formation: l.formation,
  coach: l.coach?.name,
  startXI: (l.startXI || []).map((p) => ({ id: p.player?.id, name: p.player?.name, number: p.player?.number, pos: p.player?.pos, grid: p.player?.grid })),
  substitutes: (l.substitutes || []).map((p) => ({ id: p.player?.id, name: p.player?.name, number: p.player?.number, pos: p.player?.pos })),
});

const slimStats = (s) => ({
  teamId: s.team?.id, team: s.team?.name, logo: s.team?.logo,
  statistics: (s.statistics || []).map((x) => ({ type: x.type, value: x.value })),
});

const slimPrediction = (p) => ({
  winner: p.predictions?.winner,
  winOrDraw: p.predictions?.win_or_draw,
  advice: p.predictions?.advice,
  percent: p.predictions?.percent,
  goals: p.predictions?.goals,
});

const slimScorer = (row) => ({
  player: { id: row.player?.id, name: row.player?.name, photo: row.player?.photo, nationality: row.player?.nationality },
  team: { id: row.statistics?.[0]?.team?.id, name: row.statistics?.[0]?.team?.name, logo: row.statistics?.[0]?.team?.logo },
  goals: row.statistics?.[0]?.goals?.total ?? 0,
  assists: row.statistics?.[0]?.goals?.assists ?? 0,
  appearances: row.statistics?.[0]?.games?.appearences ?? 0,
});

// --- season resolution ------------------------------------------------------

async function fetchCurrentLeagues() {
  const leagues = await api("/leagues", { current: "true" });
  const seasonByLeague = {};
  const slim = [];
  for (const item of leagues) {
    const id = item.league?.id;
    const current = (item.seasons || []).find((s) => s.current) || (item.seasons || [])[0];
    if (id && current) seasonByLeague[id] = current.year;
    slim.push({
      id, name: item.league?.name, type: item.league?.type, logo: item.league?.logo,
      country: item.country?.name, flag: item.country?.flag, season: current?.year ?? null,
    });
  }
  await save("leagues.json", { updatedAt: new Date().toISOString(), leagues: slim });
  return seasonByLeague;
}

// --- cheap tasks ------------------------------------------------------------

async function fetchLive() {
  const live = await api("/fixtures", { live: "all" });
  const fixtures = live.map(slimFixture);
  await save("live.json", { updatedAt: new Date().toISOString(), count: fixtures.length, fixtures });
  return fixtures;
}

async function fetchFixturesForDate(date) {
  const fx = await api("/fixtures", { date });
  const fixtures = fx.map(slimFixture);
  await save(`fixtures-${date}.json`, { updatedAt: new Date().toISOString(), date, count: fixtures.length, fixtures });
  return fixtures;
}

// Off-season (e.g. June) the "current" season often has an empty table, so
// fall back to the most recent season that actually has data.
function seasonCandidates(season) {
  if (!season) return [];
  return [season, season - 1, season - 2];
}

async function fetchStandings(seasonByLeague) {
  for (const leagueId of PRIORITY_LEAGUES) {
    if (!canSpend()) { console.warn(`  standings: quota low (${dailyRemaining}), stopping`); break; }
    const base = seasonByLeague[leagueId];
    if (!base) continue;
    await task(`standings ${leagueId}`, async () => {
      let chosen = base, league = null, standings = [];
      for (const s of seasonCandidates(base)) {
        if (!canSpend()) break;
        const rows = await api("/standings", { league: leagueId, season: s });
        const lg = rows[0]?.league;
        if (lg?.standings?.length) { chosen = s; league = lg; standings = lg.standings; break; }
      }
      await save(`standings-${leagueId}.json`, {
        updatedAt: new Date().toISOString(), leagueId, season: chosen,
        league: league ? { id: league.id, name: league.name, logo: league.logo, country: league.country, flag: league.flag } : null,
        standings,
      });
    });
  }
}

async function fetchTopScorers(seasonByLeague) {
  for (const leagueId of PRIORITY_LEAGUES) {
    if (!canSpend()) { console.warn(`  topscorers: quota low (${dailyRemaining}), stopping`); break; }
    const base = seasonByLeague[leagueId];
    if (!base) continue;
    await task(`topscorers ${leagueId}`, async () => {
      let chosen = base, scorers = [];
      for (const s of seasonCandidates(base)) {
        if (!canSpend()) break;
        const rows = await api("/players/topscorers", { league: leagueId, season: s });
        if (rows.length) { chosen = s; scorers = rows.map(slimScorer); break; }
      }
      if (!scorers.length) return; // no player coverage for this league
      await save(`topscorers-${leagueId}.json`, {
        updatedAt: new Date().toISOString(), leagueId, season: chosen, scorers,
      });
    });
  }
}

// --- expensive per-fixture detail ------------------------------------------

// Pick the matches worth spending per-fixture calls on.
function selectFeatured(todayFixtures = [], liveFixtures = []) {
  const seen = new Set();
  const ordered = [];
  const push = (f) => { if (f && !seen.has(f.id)) { seen.add(f.id); ordered.push(f); } };

  // 1) live priority matches first  2) the rest of today's priority matches
  liveFixtures.filter((f) => PRIORITY_SET.has(f.league.id)).forEach(push);
  todayFixtures
    .filter((f) => PRIORITY_SET.has(f.league.id))
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach(push);

  return ordered.slice(0, MAX_FEATURED);
}

async function fetchFixtureDetail(fixture, liveIds) {
  const id = fixture.id;
  const existing = (await readData(`detail-${id}.json`)) || {};
  const out = { fixtureId: id, updatedAt: new Date().toISOString(), fixture, ...existing };
  out.fixture = fixture;
  out.fixtureId = id;
  out.updatedAt = new Date().toISOString();

  const isLive = liveIds.has(id) || LIVE_SHORT.has(fixture.status?.short);
  const isDone = DONE_SHORT.has(fixture.status?.short);
  const started = isLive || isDone;

  // events + statistics: refresh while live; fetch once when finished.
  if (started && canSpend() && (isLive || !existing.events))
    await task(`events ${id}`, async () => { out.events = (await api("/fixtures/events", { fixture: id })).map(slimEvent); });
  if (started && canSpend() && (isLive || !existing.statistics))
    await task(`stats ${id}`, async () => { out.statistics = (await api("/fixtures/statistics", { fixture: id })).map(slimStats); });

  // lineups: static once announced — fetch once if we don't have them.
  if (canSpend() && (!existing.lineups || existing.lineups.length === 0))
    await task(`lineups ${id}`, async () => { out.lineups = (await api("/fixtures/lineups", { fixture: id })).map(slimLineup); });

  // predictions: useful pre-match — fetch once.
  if (!isDone && canSpend() && !existing.prediction)
    await task(`prediction ${id}`, async () => {
      const p = (await api("/predictions", { fixture: id }))[0];
      if (p) out.prediction = slimPrediction(p);
    });

  await save(`detail-${id}.json`, out);
}

async function fetchDetails(featured, liveFixtures) {
  const liveIds = new Set(liveFixtures.map((f) => f.id));
  let done = 0;
  for (const f of featured) {
    if (!canSpend()) { console.warn(`  details: quota low (${dailyRemaining}), stopping after ${done}`); break; }
    await fetchFixtureDetail(f, liveIds);
    done++;
  }
  console.log(`  fetched detail for ${done}/${featured.length} featured matches`);
  return done;
}

// --- entry ------------------------------------------------------------------

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  console.log(`fetch.mjs MODE=${MODE}`);

  let seasons = null;
  let live = [];
  let today = [];

  if (MODE === "live") {
    live = await task("live", fetchLive) || [];
  } else if (MODE === "detail") {
    // Refresh live scores, then spend remaining quota on featured detail.
    live = await task("live", fetchLive) || [];
    const todayDoc = await readData(`fixtures-${isoDate(0)}.json`);
    today = todayDoc?.fixtures || [];
    const featured = selectFeatured(today, live);
    await fetchDetails(featured, live);
  } else if (MODE === "daily") {
    seasons = await task("leagues", fetchCurrentLeagues) || {};
    for (const off of [-1, 0, 1]) {
      const fx = await task(`fixtures ${off}`, () => fetchFixturesForDate(isoDate(off)));
      if (off === 0) today = fx || [];
    }
    await fetchStandings(seasons);
    await fetchTopScorers(seasons);
    // pre-match lineups/predictions for today's featured fixtures
    const featured = selectFeatured(today, []);
    await fetchDetails(featured, []);
  } else {
    // "all": everything, quota permitting.
    seasons = await task("leagues", fetchCurrentLeagues) || {};
    live = await task("live", fetchLive) || [];
    for (const off of [-1, 0, 1]) {
      const fx = await task(`fixtures ${off}`, () => fetchFixturesForDate(isoDate(off)));
      if (off === 0) today = fx || [];
    }
    await fetchStandings(seasons);
    await fetchTopScorers(seasons);
    const featured = selectFeatured(today, live);
    await fetchDetails(featured, live);
  }

  const meta = {
    updatedAt: new Date().toISOString(),
    mode: MODE,
    callsThisRun: stats.calls,
    dailyRemaining: Number.isFinite(dailyRemaining) ? dailyRemaining : null,
    dates: { yesterday: isoDate(-1), today: isoDate(0), tomorrow: isoDate(1) },
    priorityLeagues: PRIORITY_LEAGUES,
  };
  await save("meta.json", meta);
  console.log(`Done. Calls this run: ${stats.calls}. Daily remaining: ${meta.dailyRemaining ?? "unknown"}.`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
