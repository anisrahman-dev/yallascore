import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../api.js";
import { phase, statusLabel, kickoff } from "../util.js";
import "./WorldCup.css";

const WORLD_CUP_ID = 1;
const dateKey = (iso) => (iso || "").slice(0, 10);
const fmtDay = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export default function WorldCup() {
  const meta = useData("meta.json", { refreshMs: 300000 });
  const dates = meta.data?.dates;
  const wc = useData("worldcup.json", { refreshMs: 120000 });
  const live = useData("live.json", { refreshMs: 60000 });
  // The daily fixture files already contain World Cup matches — read them too so
  // we show real data even before worldcup.json (the full schedule) exists.
  const dy = useData(dates ? `fixtures-${dates.yesterday}.json` : "meta.json", { refreshMs: 120000 });
  const dt = useData(dates ? `fixtures-${dates.today}.json` : "meta.json", { refreshMs: 90000 });
  const dm = useData(dates ? `fixtures-${dates.tomorrow}.json` : "meta.json", { refreshMs: 120000 });

  const [filter, setFilter] = useState("all"); // all | today | live

  // Merge full schedule + daily files (filtered to the World Cup), then overlay
  // in-play scores/status from live.json. Dedupe by fixture id.
  const fixtures = useMemo(() => {
    const byId = new Map();
    for (const f of wc.data?.fixtures || []) byId.set(f.id, f);
    for (const doc of [dy.data, dt.data, dm.data]) {
      for (const f of doc?.fixtures || []) {
        if (f?.league?.id === WORLD_CUP_ID) byId.set(f.id, f);
      }
    }
    for (const f of live.data?.fixtures || []) {
      if (f?.league?.id === WORLD_CUP_ID || byId.has(f.id)) byId.set(f.id, f); // live overlay wins
    }
    return [...byId.values()];
  }, [wc.data, dy.data, dt.data, dm.data, live.data]);

  const isLive = (f) => {
    const p = phase(f.status);
    return p === "live" || p === "ht";
  };
  const anyLive = fixtures.some(isLive);
  const todayKey = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (filter === "live") return fixtures.filter(isLive);
    if (filter === "today") return fixtures.filter((f) => dateKey(f.date) === todayKey);
    return fixtures;
  }, [fixtures, filter, todayKey]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const f of filtered) {
      const k = dateKey(f.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(f);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, fx]) => ({ date, fixtures: fx.sort((a, b) => a.timestamp - b.timestamp) }));
  }, [filtered]);

  const season = wc.data?.season || 2026;
  const hasData = fixtures.length > 0;
  const loading = (meta.loading || dt.loading || wc.loading) && !hasData;

  return (
    <div className="wc">
      <header className="wc-hero">
        <div className="wc-hero-glow" />
        <div className="wc-hero-inner">
          <span className="wc-trophy">🏆</span>
          <h1 className="wc-title">
            FIFA World Cup <span>{season}</span>
          </h1>
          <p className="wc-sub">United States · Canada · Mexico</p>
          {anyLive && (
            <span className="wc-live-badge">
              <span className="wc-live-dot" /> Matches live now
            </span>
          )}
        </div>
      </header>

      <div className="wc-filters">
        {[
          ["all", "Full schedule"],
          ["today", "Today"],
          ["live", "Live"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={k === filter ? "wc-filter active" : "wc-filter"}
            onClick={() => setFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="muted">Loading schedule…</div>}
      {!loading && !hasData && (
        <div className="wc-empty">
          ⚽ No World Cup matches in the current window yet — check back soon.
        </div>
      )}
      {hasData && groups.length === 0 && (
        <div className="muted">No matches for this filter.</div>
      )}

      {groups.map((g) => (
        <section key={g.date} className="wc-day">
          <h2 className="wc-day-title">{fmtDay(g.date)}</h2>
          <div className="wc-matches">
            {g.fixtures.map((f) => (
              <WCMatch key={f.id} f={f} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function WCMatch({ f }) {
  const p = phase(f.status);
  const started = p === "live" || p === "ht" || p === "finished";
  const live = p === "live" || p === "ht";
  return (
    <Link to={`/match/${f.id}`} className={`wc-match${live ? " live" : ""}`}>
      {f.league?.round && <div className="wc-round">{f.league.round}</div>}
      <div className="wc-row">
        <div className="wc-team">
          <span className="wc-team-name">{f.teams.home.name}</span>
          {f.teams.home.logo && <img src={f.teams.home.logo} alt="" loading="lazy" />}
        </div>
        <div className="wc-mid">
          {started ? (
            <div className="wc-score">
              {f.goals.home ?? 0}<span>:</span>{f.goals.away ?? 0}
            </div>
          ) : (
            <div className="wc-time">{kickoff(f.date)}</div>
          )}
          <div className={`wc-status ${p}`}>{statusLabel(f.status) || ""}</div>
        </div>
        <div className="wc-team away">
          {f.teams.away.logo && <img src={f.teams.away.logo} alt="" loading="lazy" />}
          <span className="wc-team-name">{f.teams.away.name}</span>
        </div>
      </div>
    </Link>
  );
}
