import { useEffect, useMemo, useState } from "react";
import { useData, getJSON } from "../api.js";

export default function Standings() {
  const { data: meta } = useData("meta.json");
  const { data: leaguesDoc } = useData("leagues.json", { refreshMs: 3600000 });
  const leagueIds = meta?.priorityLeagues || [];
  const nameById = new Map((leaguesDoc?.leagues || []).map((l) => [l.id, l.name]));
  const [active, setActive] = useState(null);
  const activeId = active ?? leagueIds[0];

  const [tables, setTables] = useState({}); // id -> data | error
  const current = activeId != null ? tables[activeId] : null;

  useEffect(() => {
    if (activeId == null || tables[activeId]) return;
    let alive = true;
    getJSON(`standings-${activeId}.json`)
      .then((d) => alive && setTables((t) => ({ ...t, [activeId]: { data: d } })))
      .catch((e) => alive && setTables((t) => ({ ...t, [activeId]: { error: e } })));
    return () => {
      alive = false;
    };
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => current?.data?.standings || [], [current]);

  return (
    <div className="page">
      <div className="chip-row">
        {leagueIds.map((id) => (
          <button
            key={id}
            className={id === activeId ? "chip active" : "chip"}
            onClick={() => setActive(id)}
          >
            {tables[id]?.data?.league?.name || nameById.get(id) || `League ${id}`}
          </button>
        ))}
      </div>

      {current?.data?.league && (
        <div className="standings-head">
          <img src={current.data.league.logo} alt="" />
          <h2>{current.data.league.name}</h2>
          <span className="muted">Season {current.data.season}</span>
        </div>
      )}

      {!current && <div className="muted">Loading…</div>}
      {current?.error && <div className="muted">No standings available for this league.</div>}
      {current?.data && groups.length === 0 && (
        <div className="muted">
          No table yet for {nameById.get(activeId) || "this competition"} — the season may be
          between fixtures. It’ll appear after the next data refresh.
        </div>
      )}

      {groups.map((table, gi) => (
        <div key={gi}>
          {groups.length > 1 && table[0]?.group && (
            <h3 className="standings-group">{table[0].group}</h3>
          )}
          <table className="standings">
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
                  <span className="rank-bar" style={{ background: zoneColor(row.description) }} />
                  {row.rank}
                </td>
                <td className="team-col">
                  <img src={row.team.logo} alt="" loading="lazy" />
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

function zoneColor(desc = "") {
  const d = desc.toLowerCase();
  if (d.includes("champions league")) return "#2e7dff";
  if (d.includes("europa")) return "#ff8c2e";
  if (d.includes("conference")) return "#00c853";
  if (d.includes("relegation")) return "#e5363b";
  return "transparent";
}
