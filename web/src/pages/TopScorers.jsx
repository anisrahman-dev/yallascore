import { useEffect, useState } from "react";
import { useData, getJSON } from "../api.js";

export default function TopScorers() {
  const { data: meta } = useData("meta.json");
  const { data: leaguesDoc } = useData("leagues.json", { refreshMs: 3600000 });
  const ids = meta?.priorityLeagues || [];
  const leagueById = new Map((leaguesDoc?.leagues || []).map((l) => [l.id, l]));
  const labelFor = (id) => {
    const l = leagueById.get(id);
    if (!l) return `League ${id}`;
    // Disambiguate same-named leagues (e.g. Italy vs Brazil "Serie A").
    const dupe = (leaguesDoc?.leagues || []).filter((x) => x.name === l.name).length > 1;
    return dupe && l.country ? `${l.name} (${l.country})` : l.name;
  };

  const [active, setActive] = useState(null);
  const activeId = active ?? ids[0];
  const [cache, setCache] = useState({});
  const current = activeId != null ? cache[activeId] : null;

  useEffect(() => {
    if (activeId == null || cache[activeId]) return;
    let alive = true;
    getJSON(`topscorers-${activeId}.json`)
      .then((d) => alive && setCache((c) => ({ ...c, [activeId]: { data: d } })))
      .catch((e) => alive && setCache((c) => ({ ...c, [activeId]: { error: e } })));
    return () => { alive = false; };
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scorers = current?.data?.scorers || [];

  return (
    <div className="page">
      <div className="schedule-head"><h1>Top Scorers</h1></div>

      <div className="chip-row">
        {ids.map((id) => (
          <button key={id} className={id === activeId ? "chip active" : "chip"} onClick={() => setActive(id)}>
            {labelFor(id)}
          </button>
        ))}
      </div>

      {!current && <div className="muted">Loading…</div>}
      {current?.error && <div className="muted">No top-scorer data for this competition (free-plan coverage varies by league).</div>}
      {current?.data && scorers.length === 0 && (
        <div className="muted">No top-scorer data yet for this competition — it’ll appear after the next data refresh.</div>
      )}

      {scorers.length > 0 && (
        <table className="standings scorers">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th className="team-col">Player</th>
              <th className="hide-sm">Team</th>
              <th>Apps</th>
              <th className="hide-sm">Assists</th>
              <th>Goals</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((s, i) => (
              <tr key={s.player.id || i}>
                <td className="rank">{i + 1}</td>
                <td className="team-col">
                  {s.player.photo && <img src={s.player.photo} alt="" loading="lazy" />}
                  <span>{s.player.name}</span>
                </td>
                <td className="hide-sm">
                  <span className="scorer-team">
                    {s.team.logo && <img src={s.team.logo} alt="" loading="lazy" />}
                    {s.team.name}
                  </span>
                </td>
                <td>{s.appearances}</td>
                <td className="hide-sm">{s.assists}</td>
                <td className="pts">{s.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
