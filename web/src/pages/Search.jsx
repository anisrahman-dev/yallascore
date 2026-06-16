import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../api.js";
import "./Search.css";

const CAP = 25;

export default function Search() {
  const { data: meta } = useData("meta.json");
  const { data: leaguesDoc } = useData("leagues.json", { refreshMs: 3600000 });
  const { data: live } = useData("live.json", { refreshMs: 30000 });
  const today = meta?.dates?.today;
  const { data: todayDoc } = useData(today ? `fixtures-${today}.json` : "meta.json");

  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const leagues = leaguesDoc?.leagues || [];

  // Collect unique teams from live + today's fixtures.
  const teams = useMemo(() => {
    const fixtures = [
      ...(live?.fixtures || []),
      ...(today && todayDoc?.fixtures ? todayDoc.fixtures : []),
    ];
    const byId = new Map();
    for (const f of fixtures) {
      for (const side of ["home", "away"]) {
        const t = f?.teams?.[side];
        if (t && t.id != null && !byId.has(t.id)) byId.set(t.id, t);
      }
    }
    return Array.from(byId.values());
  }, [live, todayDoc, today]);

  const leagueResults = useMemo(() => {
    if (!query) return [];
    return leagues
      .filter((l) => {
        const name = (l.name || "").toLowerCase();
        const country = (l.country || "").toLowerCase();
        return name.includes(query) || country.includes(query);
      })
      .slice(0, CAP);
  }, [leagues, query]);

  const teamResults = useMemo(() => {
    if (!query) return [];
    return teams
      .filter((t) => (t.name || "").toLowerCase().includes(query))
      .slice(0, CAP);
  }, [teams, query]);

  const hasQuery = query.length > 0;
  const empty = hasQuery && leagueResults.length === 0 && teamResults.length === 0;

  return (
    <div className="page">
      <div className="search-head">
        <h1>Search</h1>
      </div>

      <input
        className="search-input"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search competitions and teams…"
        autoFocus
      />

      {!hasQuery && (
        <div className="muted search-hint">
          Type to find competitions and teams.
        </div>
      )}

      {empty && (
        <div className="muted">No results for “{q.trim()}”.</div>
      )}

      {leagueResults.length > 0 && (
        <section className="search-section">
          <h2 className="search-section-title">Competitions</h2>
          <div className="search-list">
            {leagueResults.map((l) => (
              <Link key={l.id} className="search-item" to={`/league/${l.id}`}>
                {l.logo && <img src={l.logo} alt="" loading="lazy" />}
                <span className="search-item-main">{l.name}</span>
                {l.country && <span className="search-item-sub">{l.country}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {teamResults.length > 0 && (
        <section className="search-section">
          <h2 className="search-section-title">Teams</h2>
          <div className="search-list">
            {teamResults.map((t) => (
              <Link key={t.id} className="search-item" to={`/team/${t.id}`}>
                {t.logo && <img src={t.logo} alt="" loading="lazy" />}
                <span className="search-item-main">{t.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
