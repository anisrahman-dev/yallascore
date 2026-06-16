import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useData, getJSON } from "../api.js";
import { dayLabel } from "../util.js";
import MatchRow from "../components/MatchRow.jsx";
import "./League.css";

const TABS = [
  { key: "matches", label: "Matches" },
  { key: "table", label: "Table" },
  { key: "scorers", label: "Scorers" },
];

export default function League() {
  const { id } = useParams();
  const leagueId = Number(id);

  const [tab, setTab] = useState("matches");

  const { data: meta } = useData("meta.json", { refreshMs: 300000 });
  const { data: leaguesDoc } = useData("leagues.json", { refreshMs: 3600000 });

  // Standings load (also used as a header fallback).
  const [standings, setStandings] = useState(null); // {data}|{error}|null
  useEffect(() => {
    if (!leagueId) return;
    let alive = true;
    setStandings(null);
    getJSON(`standings-${leagueId}.json`)
      .then((d) => alive && setStandings({ data: d }))
      .catch((e) => alive && setStandings({ error: e }));
    return () => {
      alive = false;
    };
  }, [leagueId]);

  // Top scorers load.
  const [scorers, setScorers] = useState(null); // {data}|{error}|null
  useEffect(() => {
    if (!leagueId) return;
    let alive = true;
    setScorers(null);
    getJSON(`topscorers-${leagueId}.json`)
      .then((d) => alive && setScorers({ data: d }))
      .catch((e) => alive && setScorers({ error: e }));
    return () => {
      alive = false;
    };
  }, [leagueId]);

  // Matches: gather fixtures from yesterday/today/tomorrow.
  const [matches, setMatches] = useState(null); // {byDay}|{error}|null
  const dates = meta?.dates;
  useEffect(() => {
    if (!leagueId || !dates) return;
    let alive = true;
    setMatches(null);
    const days = [dates.yesterday, dates.today, dates.tomorrow].filter(Boolean);
    Promise.all(
      days.map((d) =>
        getJSON(`fixtures-${d}.json`)
          .then((doc) => ({ date: d, fixtures: doc?.fixtures || [] }))
          .catch(() => ({ date: d, fixtures: [] }))
      )
    )
      .then((results) => {
        if (!alive) return;
        const byDay = results
          .map((r) => ({
            date: r.date,
            fixtures: r.fixtures
              .filter((f) => f?.league?.id === leagueId)
              .sort((a, b) => a.timestamp - b.timestamp),
          }))
          .filter((d) => d.fixtures.length > 0);
        setMatches({ byDay });
      })
      .catch((e) => alive && setMatches({ error: e }));
    return () => {
      alive = false;
    };
  }, [leagueId, dates]);

  // Header info: leagues.json first, then standings doc league fallback.
  const headerLeague = useMemo(() => {
    const fromDoc = (leaguesDoc?.leagues || []).find((l) => l.id === leagueId);
    if (fromDoc) return fromDoc;
    return standings?.data?.league || null;
  }, [leaguesDoc, leagueId, standings]);

  const headerName = headerLeague?.name || `League ${leagueId}`;
  const headerLogo = headerLeague?.logo;
  const headerCountry = headerLeague?.country;
  const headerFlag = headerLeague?.flag;

  if (!Number.isFinite(leagueId)) {
    return (
      <div className="page league-page">
        <div className="muted">Unknown competition.</div>
      </div>
    );
  }

  return (
    <div className="page league-page">
      <header className="league-hero">
        {headerLogo ? (
          <img className="league-hero-logo" src={headerLogo} alt="" loading="lazy" />
        ) : (
          <div className="league-hero-logo league-hero-ph" />
        )}
        <div className="league-hero-meta">
          <h1 className="league-hero-name">{headerName}</h1>
          {headerCountry && (
            <span className="league-hero-country">
              {headerFlag && <img src={headerFlag} alt="" loading="lazy" />}
              {headerCountry}
            </span>
          )}
        </div>
      </header>

      <div className="league-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === tab ? "league-tab active" : "league-tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "matches" && <MatchesTab matches={matches} />}
      {tab === "table" && <TableTab standings={standings} />}
      {tab === "scorers" && <ScorersTab scorers={scorers} />}
    </div>
  );
}

function MatchesTab({ matches }) {
  if (matches == null) return <div className="muted">Loading matches…</div>;
  if (matches.error)
    return <div className="muted">Couldn’t load matches for this competition.</div>;
  if (!matches.byDay || matches.byDay.length === 0)
    return (
      <div className="league-empty muted">
        No fixtures for this competition around today.
      </div>
    );

  return (
    <div className="league-matches">
      {matches.byDay.map((day) => (
        <section key={day.date} className="league-day">
          <h2 className="league-day-title">{dayLabel(day.date)}</h2>
          <div className="league-card match-list">
            {day.fixtures.map((f) => (
              <MatchRow key={f.id} f={f} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TableTab({ standings }) {
  if (standings == null) return <div className="muted">Loading table…</div>;
  if (standings.error)
    return (
      <div className="league-empty muted">
        No standings available for this competition.
      </div>
    );

  const groups = standings.data?.standings || [];
  if (groups.length === 0)
    return (
      <div className="league-empty muted">
        No standings available for this competition.
      </div>
    );

  return (
    <div className="league-tables">
      {groups.map((table, gi) => (
        <div key={gi}>
          {groups.length > 1 && table[0]?.group && (
            <h3 className="standings-group">{table[0].group}</h3>
          )}
          <table className="league-table">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th className="team-col">Team</th>
              <th>P</th>
              <th className="hide-sm">W</th>
              <th className="hide-sm">D</th>
              <th className="hide-sm">L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.team.id}>
                <td className="rank">
                  <span
                    className="league-zone"
                    style={{ background: zoneColor(row.description) }}
                  />
                  {row.rank}
                </td>
                <td className="team-col">
                  {row.team.logo && (
                    <img src={row.team.logo} alt="" loading="lazy" />
                  )}
                  <span>{row.team.name}</span>
                </td>
                <td>{row.all.played}</td>
                <td className="hide-sm">{row.all.win}</td>
                <td className="hide-sm">{row.all.draw}</td>
                <td className="hide-sm">{row.all.lose}</td>
                <td>{row.goalsDiff}</td>
                <td className="pts">{row.points}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ScorersTab({ scorers }) {
  if (scorers == null) return <div className="muted">Loading scorers…</div>;
  if (scorers.error)
    return (
      <div className="league-empty muted">
        No top-scorer data for this competition.
      </div>
    );

  const list = scorers.data?.scorers || [];
  if (list.length === 0)
    return (
      <div className="league-empty muted">
        No top-scorer data for this competition.
      </div>
    );

  return (
    <ol className="league-scorers league-card">
      {list.map((s, i) => (
        <li key={s.player?.id || i} className="league-scorer">
          <span className="league-scorer-rank">{i + 1}</span>
          {s.player?.photo ? (
            <img className="league-scorer-photo" src={s.player.photo} alt="" loading="lazy" />
          ) : (
            <span className="league-scorer-photo league-scorer-ph" />
          )}
          <div className="league-scorer-meta">
            <span className="league-scorer-name">{s.player?.name}</span>
            <span className="league-scorer-team">
              {s.team?.logo && <img src={s.team.logo} alt="" loading="lazy" />}
              {s.team?.name}
            </span>
          </div>
          <div className="league-scorer-stats">
            <span className="league-scorer-assists">
              {s.assists ?? 0} <em>assists</em>
            </span>
            <span className="league-scorer-goals">
              {s.goals ?? 0} <em>goals</em>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function zoneColor(desc = "") {
  const d = (desc || "").toLowerCase();
  if (d.includes("champions league")) return "#2e7dff";
  if (d.includes("europa")) return "#ff8c2e";
  if (d.includes("conference")) return "#00c853";
  if (d.includes("relegation")) return "#e5363b";
  return "transparent";
}
