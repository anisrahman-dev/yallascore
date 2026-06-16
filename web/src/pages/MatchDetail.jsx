import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../api.js";
import { phase, statusLabel, kickoff } from "../util.js";
import MatchExtras from "../components/MatchExtras.jsx";

export default function MatchDetail() {
  const { id } = useParams();
  const fixtureId = Number(id);
  const [match, setMatch] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const [tick, setTick] = useState(0); // bumped by the live poller to refetch

  // Reset view when navigating to a different fixture.
  useEffect(() => {
    setLoading(true);
    setMatch(null);
    setDetail(null);
  }, [fixtureId]);

  // Load (initial + on each poll tick). Does not blank the screen on refresh.
  useEffect(() => {
    let alive = true;
    (async () => {
      let d = null;
      try { d = await getJSON(`detail-${fixtureId}.json`); } catch { /* none yet */ }
      if (d?.fixture && alive) { setDetail(d); setMatch(d.fixture); }

      if (!d?.fixture) {
        let meta;
        try { meta = await getJSON("meta.json"); } catch { meta = null; }
        const files = ["live.json"];
        if (meta?.dates) files.push(
          `fixtures-${meta.dates.today}.json`,
          `fixtures-${meta.dates.yesterday}.json`,
          `fixtures-${meta.dates.tomorrow}.json`
        );
        for (const file of files) {
          try {
            const doc = await getJSON(file);
            const hit = (doc.fixtures || []).find((f) => f.id === fixtureId);
            if (hit && alive) { setMatch(hit); break; }
          } catch { /* skip */ }
        }
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [fixtureId, tick]);

  // While the match is live, refetch every 45s so score/minute/events stay fresh.
  useEffect(() => {
    if (!match) return;
    const p = phase(match.status);
    if (p !== "live" && p !== "ht") return;
    const t = setInterval(() => setTick((x) => x + 1), 45000);
    return () => clearInterval(t);
  }, [match]);

  if (loading) return <div className="page"><div className="muted">Loading…</div></div>;
  if (!match)
    return (
      <div className="page">
        <Link to="/" className="back">← Back</Link>
        <div className="muted">Match not found in cached data.</div>
      </div>
    );

  const p = phase(match.status);
  const started = p === "live" || p === "ht" || p === "finished";
  const homeId = match.teams.home.id;

  const has = {
    events: detail?.events?.length > 0,
    lineups: detail?.lineups?.length >= 2,
    stats: detail?.statistics?.length >= 2,
    prediction: !!detail?.prediction,
  };

  return (
    <div className="page">
      <Link to="/" className="back">← Back</Link>

      <div className="md-league">
        {match.league.logo && <img src={match.league.logo} alt="" />}
        <span>{match.league.country} · {match.league.name}{match.league.round ? ` · ${match.league.round}` : ""}</span>
      </div>

      <div className="md-score">
        <Link className="md-team" to={`/team/${match.teams.home.id}`}>
          <img src={match.teams.home.logo} alt="" />
          <span>{match.teams.home.name}</span>
        </Link>
        <div className="md-center">
          {started ? (
            <div className="md-goals">{match.goals.home ?? 0} <span>–</span> {match.goals.away ?? 0}</div>
          ) : (
            <div className="md-ko">{kickoff(match.date)}</div>
          )}
          <div className={`md-status ${p}`}>{statusLabel(match.status) || match.status.long}</div>
        </div>
        <Link className="md-team" to={`/team/${match.teams.away.id}`}>
          <img src={match.teams.away.logo} alt="" />
          <span>{match.teams.away.name}</span>
        </Link>
      </div>

      {(has.events || has.lineups || has.stats || has.prediction) && (
        <div className="md-tabs">
          {has.events && <Tab id="summary" tab={tab} set={setTab}>Summary</Tab>}
          {has.lineups && <Tab id="lineups" tab={tab} set={setTab}>Lineups</Tab>}
          {has.stats && <Tab id="stats" tab={tab} set={setTab}>Stats</Tab>}
          {has.prediction && <Tab id="prediction" tab={tab} set={setTab}>Prediction</Tab>}
        </div>
      )}

      {tab === "summary" && has.events && <Events events={detail.events} homeId={homeId} />}
      {tab === "lineups" && has.lineups && <Lineups lineups={detail.lineups} homeId={homeId} />}
      {tab === "stats" && has.stats && <Stats statistics={detail.statistics} homeId={homeId} />}
      {tab === "prediction" && has.prediction && <Prediction p={detail.prediction} match={match} />}

      <div className="md-info">
        {match.venue && <div><span>Venue</span>{match.venue}</div>}
        <div><span>Kick-off</span>{new Date(match.date).toLocaleString()}</div>
      </div>

      {!detail && (
        <p className="muted small">
          Detailed events, lineups and stats are fetched only for featured matches
          (top leagues / live games) within the free-plan quota. Check back near kickoff.
        </p>
      )}

      <MatchExtras f={match} />
    </div>
  );
}

function Tab({ id, tab, set, children }) {
  return (
    <button className={tab === id ? "md-tab active" : "md-tab"} onClick={() => set(id)}>
      {children}
    </button>
  );
}

function eventIcon(e) {
  const t = (e.type || "").toLowerCase();
  const d = (e.detail || "").toLowerCase();
  if (t === "goal") return d.includes("missed") ? "✖" : "⚽";
  if (t === "card") return d.includes("red") ? "🟥" : "🟨";
  if (t === "subst") return "🔁";
  if (t === "var") return "📺";
  return "•";
}

function Events({ events, homeId }) {
  const sorted = [...events].sort((a, b) => (a.elapsed ?? 0) - (b.elapsed ?? 0));
  return (
    <div className="card timeline">
      {sorted.map((e, i) => {
        const home = e.teamId === homeId;
        return (
          <div key={i} className={`ev ${home ? "home" : "away"}`}>
            <div className="ev-side ev-home">{home && <EvBody e={e} />}</div>
            <div className="ev-min">{e.elapsed}{e.extra ? `+${e.extra}` : ""}'</div>
            <div className="ev-side ev-away">{!home && <EvBody e={e} />}</div>
          </div>
        );
      })}
    </div>
  );
}

function EvBody({ e }) {
  return (
    <div className="ev-body">
      <span className="ev-icon">{eventIcon(e)}</span>
      <span className="ev-text">
        <strong>{e.player || e.detail}</strong>
        {e.type === "subst" && e.assist ? <em> ↔ {e.assist}</em> : null}
        {e.type === "goal" && e.assist ? <em> (assist {e.assist})</em> : null}
        {e.type === "card" ? <em> {e.detail}</em> : null}
      </span>
    </div>
  );
}

function Stats({ statistics, homeId }) {
  const home = statistics.find((s) => s.teamId === homeId) || statistics[0];
  const away = statistics.find((s) => s.teamId !== homeId) || statistics[1];
  const types = home.statistics.map((s) => s.type);
  const valOf = (team, type) => team.statistics.find((s) => s.type === type)?.value ?? 0;
  const num = (v) => (typeof v === "string" ? parseFloat(v) || 0 : v || 0);

  return (
    <div className="card stats">
      {types.map((type) => {
        const h = valOf(home, type), a = valOf(away, type);
        const hn = num(h), an = num(a), total = hn + an || 1;
        return (
          <div className="stat-row" key={type}>
            <span className="stat-v">{h ?? 0}</span>
            <div className="stat-mid">
              <span className="stat-type">{type}</span>
              <div className="stat-bar">
                <div className="stat-bar-h" style={{ width: `${(hn / total) * 100}%` }} />
                <div className="stat-bar-a" style={{ width: `${(an / total) * 100}%` }} />
              </div>
            </div>
            <span className="stat-v">{a ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
}

function Lineups({ lineups, homeId }) {
  const home = lineups.find((l) => l.teamId === homeId) || lineups[0];
  const away = lineups.find((l) => l.teamId !== homeId) || lineups[1];
  return (
    <div className="lineups">
      {[home, away].map((l, i) => (
        <div className="card lineup" key={i}>
          <div className="lineup-head">
            <strong>{l.team}</strong>
            <span className="muted">{l.formation}</span>
          </div>
          <ul className="xi">
            {l.startXI.map((p) => (
              <li key={p.id || p.name}>
                <span className="num">{p.number}</span> {p.name} <span className="pos">{p.pos}</span>
              </li>
            ))}
          </ul>
          {l.coach && <div className="coach">Coach: {l.coach}</div>}
        </div>
      ))}
    </div>
  );
}

function Prediction({ p, match }) {
  const pct = p.percent || {};
  return (
    <div className="card prediction">
      {p.advice && <div className="pred-advice">💡 {p.advice}</div>}
      <div className="pred-bars">
        <PredBar label={match.teams.home.name} value={pct.home} />
        <PredBar label="Draw" value={pct.draw} />
        <PredBar label={match.teams.away.name} value={pct.away} />
      </div>
    </div>
  );
}

function PredBar({ label, value }) {
  const v = parseInt(value) || 0;
  return (
    <div className="pred-row">
      <span className="pred-label">{label}</span>
      <div className="pred-track"><div className="pred-fill" style={{ width: `${v}%` }} /></div>
      <span className="pred-val">{value || "0%"}</span>
    </div>
  );
}
