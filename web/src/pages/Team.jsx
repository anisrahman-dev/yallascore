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
  const [fixtures, setFixtures] = useState(null); // null = loading, [] = loaded
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!meta) return;
    let alive = true;
    const ctrl = new AbortController();

    const dates = meta.dates || {};
    const files = [
      "live.json",
      dates.yesterday ? `fixtures-${dates.yesterday}.json` : null,
      dates.today ? `fixtures-${dates.today}.json` : null,
      dates.tomorrow ? `fixtures-${dates.tomorrow}.json` : null,
    ].filter(Boolean);

    Promise.all(
      files.map((f) =>
        getJSON(f, { signal: ctrl.signal }).catch(() => null)
      )
    )
      .then((results) => {
        if (!alive) return;
        // Merge + de-dupe by fixture id.
        const byId = new Map();
        for (const r of results) {
          const arr = r?.fixtures || [];
          for (const fx of arr) {
            if (!byId.has(fx.id)) byId.set(fx.id, fx);
          }
        }
        const mine = [...byId.values()].filter(
          (fx) =>
            fx.teams?.home?.id === teamId || fx.teams?.away?.id === teamId
        );
        setFixtures(mine);
      })
      .catch(() => {
        if (alive) setErr(true);
      });

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [meta, teamId]);

  const team = useMemo(() => {
    if (!fixtures || !fixtures.length) return null;
    const f = fixtures[0];
    return f.teams.home.id === teamId ? f.teams.home : f.teams.away;
  }, [fixtures, teamId]);

  const { results, upcoming } = useMemo(() => {
    const r = [];
    const u = [];
    for (const f of fixtures || []) {
      if (phase(f.status) === "finished") r.push(f);
      else u.push(f);
    }
    r.sort((a, b) => a.timestamp - b.timestamp);
    u.sort((a, b) => a.timestamp - b.timestamp);
    return { results: r, upcoming: u };
  }, [fixtures]);

  const form = useMemo(() => {
    // Last up to 5 finished results, most recent last visually -> compute then slice.
    const finished = (fixtures || [])
      .filter((f) => phase(f.status) === "finished")
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-5);
    return finished.map((f) => {
      const isHome = f.teams.home.id === teamId;
      const gf = isHome ? f.goals.home : f.goals.away;
      const ga = isHome ? f.goals.away : f.goals.home;
      let r = "d";
      if (gf > ga) r = "w";
      else if (gf < ga) r = "l";
      return { id: f.id, r };
    });
  }, [fixtures, teamId]);

  if (!meta || fixtures === null) {
    return (
      <div className="page team-page">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (err || !team) {
    return (
      <div className="page team-page">
        <div className="team-empty">
          No matches found for this team in the current window.
          <div className="team-empty-sub">
            <Link to="/">Back to matches</Link>
          </div>
        </div>
      </div>
    );
  }

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
              <span key={p.id} className={`team-pill ${p.r}`}>
                {p.r.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <section className="team-section">
          <h3 className="team-section-title">Results</h3>
          <div className="match-list">
            {results.map((f) => (
              <MatchRow key={f.id} f={f} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="team-section">
          <h3 className="team-section-title">Upcoming</h3>
          <div className="match-list">
            {upcoming.map((f) => (
              <MatchRow key={f.id} f={f} />
            ))}
          </div>
        </section>
      )}

      {results.length === 0 && upcoming.length === 0 && (
        <div className="team-empty">No matches in the current window.</div>
      )}
    </div>
  );
}
