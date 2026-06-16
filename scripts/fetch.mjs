#!/usr/bin/env node
// Fetches data from API-Football and writes JSON files into ../data
// Pure Node 18+ (uses global fetch). No dependencies.
//
// Required env: API_FOOTBALL_KEY
// Optional env: MODE = "live" | "daily" | "all"  (default "all")
//
// API docs: https://www.api-football.com/documentation-v3
// Free plan: 100 requests/day. This script budgets calls accordingly.

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

// Leagues we want standings for (everything else still shows via the
// all-fixtures endpoints, which return every league in one call).
// IDs from API-Football. Trim or extend as your budget allows.
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
];

// --- tiny HTTP layer with quota tracking -----------------------------------

let dailyRemaining = Infinity; // updated from response headers
const stats = { calls: 0 };

async function api(path, params = {}) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { "x-apisports-key": KEY } });
  stats.calls++;

  // API-Sports quota headers
  const remDay = res.headers.get("x-ratelimit-requests-remaining");
  if (remDay != null) dailyRemaining = Number(remDay);

  if (!res.ok) {
    throw new Error(`API ${res.status} for ${url.pathname}${url.search}`);
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    // API returns 200 with an errors object on quota / param problems
    console.warn(`  ! API errors for ${path}:`, JSON.stringify(json.errors));
  }
  return json.response || [];
}

async function save(name, payload) {
  await writeFile(join(DATA_DIR, name), JSON.stringify(payload), "utf8");
  console.log(`  wrote data/${name}`);
}

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// --- season resolution ------------------------------------------------------
// One call to /leagues?current=true returns every league with its current
// season, so we can request standings for the right season per league.

async function fetchCurrentLeagues() {
  const leagues = await api("/leagues", { current: "true" });
  const seasonByLeague = {};
  const slim = [];
  for (const item of leagues) {
    const id = item.league?.id;
    const current = (item.seasons || []).find((s) => s.current) || (item.seasons || [])[0];
    if (id && current) seasonByLeague[id] = current.year;
    slim.push({
      id,
      name: item.league?.name,
      type: item.league?.type,
      logo: item.league?.logo,
      country: item.country?.name,
      flag: item.country?.flag,
      season: current?.year ?? null,
    });
  }
  await save("leagues.json", { updatedAt: new Date().toISOString(), leagues: slim });
  return seasonByLeague;
}

// --- normalizers: keep the payloads small ----------------------------------

function slimFixture(f) {
  return {
    id: f.fixture.id,
    date: f.fixture.date,
    timestamp: f.fixture.timestamp,
    status: f.fixture.status, // { long, short, elapsed }
    venue: f.fixture.venue?.name,
    league: {
      id: f.league.id,
      name: f.league.name,
      country: f.league.country,
      logo: f.league.logo,
      flag: f.league.flag,
      round: f.league.round,
    },
    teams: {
      home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo, winner: f.teams.home.winner },
      away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo, winner: f.teams.away.winner },
    },
    goals: f.goals, // { home, away }
    score: f.score, // { halftime, fulltime, extratime, penalty }
  };
}

// --- tasks ------------------------------------------------------------------

async function fetchLive() {
  const live = await api("/fixtures", { live: "all" });
  await save("live.json", {
    updatedAt: new Date().toISOString(),
    count: live.length,
    fixtures: live.map(slimFixture),
  });
}

async function fetchFixturesForDate(date) {
  const fx = await api("/fixtures", { date });
  await save(`fixtures-${date}.json`, {
    updatedAt: new Date().toISOString(),
    date,
    count: fx.length,
    fixtures: fx.map(slimFixture),
  });
}

async function fetchStandings(seasonByLeague) {
  for (const leagueId of PRIORITY_LEAGUES) {
    if (dailyRemaining <= 5) {
      console.warn(`  stopping standings early; daily quota low (${dailyRemaining})`);
      break;
    }
    const season = seasonByLeague[leagueId];
    if (!season) {
      console.warn(`  no current season for league ${leagueId}, skipping`);
      continue;
    }
    try {
      const rows = await api("/standings", { league: leagueId, season });
      const league = rows[0]?.league;
      await save(`standings-${leagueId}.json`, {
        updatedAt: new Date().toISOString(),
        leagueId,
        season,
        league: league
          ? { id: league.id, name: league.name, logo: league.logo, country: league.country, flag: league.flag }
          : null,
        standings: league?.standings || [],
      });
    } catch (e) {
      console.warn(`  standings ${leagueId} failed: ${e.message}`);
    }
  }
}

// --- entry ------------------------------------------------------------------

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  console.log(`fetch.mjs MODE=${MODE}`);

  if (MODE === "live") {
    await fetchLive();
  } else if (MODE === "daily") {
    const seasons = await fetchCurrentLeagues();
    for (const off of [-1, 0, 1]) await fetchFixturesForDate(isoDate(off));
    await fetchStandings(seasons);
  } else {
    // "all": full refresh
    const seasons = await fetchCurrentLeagues();
    await fetchLive();
    for (const off of [-1, 0, 1]) await fetchFixturesForDate(isoDate(off));
    await fetchStandings(seasons);
  }

  // write meta last so the site can read freshness + quota
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

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
