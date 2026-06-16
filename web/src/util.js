// Match status helpers. API-Football short codes:
// NS=not started, 1H/2H/ET/P/HT/BT live, FT/AET/PEN finished, PST/CANC/etc.
const LIVE = new Set(["1H", "2H", "ET", "P", "BT", "LIVE", "INT"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);

export function phase(status) {
  const s = status?.short;
  if (s === "HT") return "ht";
  if (LIVE.has(s)) return "live";
  if (FINISHED.has(s)) return "finished";
  if (s === "NS") return "scheduled";
  return "other"; // postponed, cancelled, suspended...
}

export function statusLabel(status) {
  const s = status?.short;
  if (s === "HT") return "HT";
  if (s === "FT") return "FT";
  if (s === "AET") return "AET";
  if (s === "PEN") return "PEN";
  if (LIVE.has(s)) return status.elapsed != null ? `${status.elapsed}'` : "LIVE";
  return status?.short || "";
}

export function kickoff(dateISO) {
  const d = new Date(dateISO);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const tmrw = new Date(today); tmrw.setDate(today.getDate() + 1);
  const yday = new Date(today); yday.setDate(today.getDate() - 1);
  if (same(d, today)) return "Today";
  if (same(d, tmrw)) return "Tomorrow";
  if (same(d, yday)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

// Group fixtures by league, ordering priority leagues first.
export function groupByLeague(fixtures, priority = []) {
  const byId = new Map();
  for (const f of fixtures) {
    const id = f.league.id;
    if (!byId.has(id)) byId.set(id, { league: f.league, fixtures: [] });
    byId.get(id).fixtures.push(f);
  }
  const groups = [...byId.values()];
  const rank = (id) => {
    const i = priority.indexOf(id);
    return i === -1 ? priority.length + 1 : i;
  };
  groups.sort((a, b) => {
    const r = rank(a.league.id) - rank(b.league.id);
    if (r !== 0) return r;
    return (a.league.country || "").localeCompare(b.league.country || "");
  });
  // sort matches within a league: live first, then by kickoff
  for (const g of groups) {
    g.fixtures.sort((a, b) => a.timestamp - b.timestamp);
  }
  return groups;
}
