import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../api.js";
import { phase, statusLabel, kickoff } from "../util.js";

export default function MatchDetail() {
  const { id } = useParams();
  const fixtureId = Number(id);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    async function find() {
      // The match could be in today's live feed or any of the cached day files.
      let meta;
      try {
        meta = await getJSON("meta.json");
      } catch {
        meta = null;
      }
      const files = ["live.json"];
      if (meta?.dates) files.push(
        `fixtures-${meta.dates.today}.json`,
        `fixtures-${meta.dates.yesterday}.json`,
        `fixtures-${meta.dates.tomorrow}.json`
      );
      for (const file of files) {
        try {
          const d = await getJSON(file);
          const hit = (d.fixtures || []).find((f) => f.id === fixtureId);
          if (hit && alive) {
            setMatch(hit);
            setLoading(false);
            return;
          }
        } catch {
          /* skip missing file */
        }
      }
      if (alive) setLoading(false);
    }

    find();
    return () => {
      alive = false;
    };
  }, [fixtureId]);

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
  const ht = match.score?.halftime;

  return (
    <div className="page">
      <Link to="/" className="back">← Back</Link>

      <div className="md-league">
        {match.league.logo && <img src={match.league.logo} alt="" />}
        <span>{match.league.country} · {match.league.name}</span>
      </div>

      <div className="md-score">
        <div className="md-team">
          <img src={match.teams.home.logo} alt="" />
          <span>{match.teams.home.name}</span>
        </div>
        <div className="md-center">
          {started ? (
            <div className="md-goals">
              {match.goals.home ?? 0} <span>–</span> {match.goals.away ?? 0}
            </div>
          ) : (
            <div className="md-ko">{kickoff(match.date)}</div>
          )}
          <div className={`md-status ${p}`}>{statusLabel(match.status) || match.status.long}</div>
        </div>
        <div className="md-team">
          <img src={match.teams.away.logo} alt="" />
          <span>{match.teams.away.name}</span>
        </div>
      </div>

      <div className="md-info">
        {match.league.round && <div><span>Round</span>{match.league.round}</div>}
        {match.venue && <div><span>Venue</span>{match.venue}</div>}
        {started && ht?.home != null && (
          <div><span>Half-time</span>{ht.home} – {ht.away}</div>
        )}
        <div><span>Kick-off</span>{new Date(match.date).toLocaleString()}</div>
      </div>

      <p className="muted small">
        Detailed events, lineups and stats aren’t included on the free API plan’s
        budget. This view shows the cached scoreline and fixture info.
      </p>
    </div>
  );
}
