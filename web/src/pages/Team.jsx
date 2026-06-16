import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON, useData } from "../api.js";
import { phase } from "../util.js";
import MatchRow from "../components/MatchRow.jsx";
import "./Team.css";

export default function Team() {
  const { id } = useParams();
  const teamId = Number(id);

  const { data: meta } = useData("meta.json");
  const [data, setData] = useState(null); // {team, fixtures} | null=loading
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(teamId)) { setErr(true); return; }
    let alive = true;
    const ctrl = new AbortController();
    setData(null);
    setErr(false);

    async function run() {
      // 1) Prefer a per-team file the Action emits (fuller history than 3 days).
      let teamDoc = null;
      try { teamDoc = await getJSON(`team-${teamId}.json`, { signal: ctrl.signal }); } catch { /* none */ }

      // 2) Always also gather the current window (covers today/live even if the
      //    team file is stale, and is the fallback when there's no team file).
      const dates = meta?.dates || {};
      const files = [
        "live.json",
        dates.yesterday && `fixtures-${dates.yesterday}.json`,
        dates.today && `fixtures-${dates.today}.json`,
        dates.tomorrow && `fixtures-${dates.tomorrow}.json`,
      ].filter(Boolean);
      const windowDocs = await Promise.all(
        files.map((f) => getJSON(f, { signal: ctrl.signal }).catch(() => null))
      );

      if (!alive) return;

      const byId = new Map();
      const add = (arr) => {
        for (const fx of arr || []) {
          const mine = fx?.teams?.home?.id === teamId || fx?.teams?.away?.id === teamId;
          if (mine && fx.id != null) byId.set(fx.id, fx); // window overrides stale team file
        }
      };
      add(teamDoc?.results);
      add(teamDoc?.upcoming);
      for (const d of windowDocs) add(d?.fixtures);

      const fixtures = [...byId.values()];
      const team =
        teamDoc?.team ||
        (fixtures[0] &&
          (fixtures[0].teams.home.id === teamId
            ? fixtures[0].teams.home
            : fixtures[0].teams.away)) ||
        null;

      setData({ team, fixtures });
    }

    run().catch(() => alive && setErr(true));
    return () => { alive = false; ctrl.abort(); };
  }, [meta, teamId]);

  const fixtures = data?.fixtures || [];

  const { results, upcoming } = useMemo(() => {
    const r = [], u = [];
    for (const f of fixtures) {
      if (phase(f.status) === "finished") r.push(f);
      else u.push(f);
    }
    r.sort((a, b) => b.timestamp - a.timestamp); // newest result first
    u.sort((a, b) => a.timestamp - b.timestamp); // soonest upcoming first
    return { results: r, upcoming: u };
  }, [fixtures]);

  const form = useMemo(() => {
    return results
      .filter((f) => f.goals?.home != null && f.goals?.away != null) // skip unplayed
      .slice(0, 5) // most recent 5 (results already newest-first)
      .reverse() // display oldest→newest
      .map((f) => {
        const isHome = f.teams.home.id === teamId;
        const gf = isHome ? f.goals.home : f.goals.away;
        const ga = isHome ? f.goals.away : f.goals.home;
        return { id: f.id, r: gf > ga ? "w" : gf < ga ? "l" : "d" };
      });
  }, [results, teamId]);

  if (!meta && !err) {
    return <div className="page team-page"><div className="muted">Loading…</div></div>;
  }
  if (data === null && !err) {
    return <div className="page team-page"><div className="muted">Loading…</div></div>;
  }
  if (err || !data?.team) {
    return (
      <div className="page team-page">
        <div className="team-empty">
          No recent matches found for this team.
          <div className="team-empty-sub"><Link to="/">Back to matches</Link></div>
        </div>
      </div>
    );
  }

  const team = data.team;

  return (
    <div className="page team-page">
      <header className="team-header">
        {team.logo ? <img src={team.logo} alt="" /> : null}
        <h2 className="team-title">{team.name}</h2>
      </header>

      {form.length > 0 && (
        <div className="team-form">
          <span className="team-form-label">Form</span>
          <div className="team-form-pills">
            {form.map((p) => (
              <span key={p.id} className={`team-pill ${p.r}`}>{p.r.toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="team-section">
          <h3 className="team-section-title">Upcoming</h3>
          <div className="match-list">
            {upcoming.map((f) => <MatchRow key={f.id} f={f} />)}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="team-section">
          <h3 className="team-section-title">Results</h3>
          <div className="match-list">
            {results.map((f) => <MatchRow key={f.id} f={f} />)}
          </div>
        </section>
      )}

      {results.length === 0 && upcoming.length === 0 && (
        <div className="team-empty">No matches available for this team yet.</div>
      )}
    </div>
  );
}
