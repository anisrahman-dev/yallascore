import { Link } from "react-router-dom";
import { useData } from "../api.js";

// LiveSoccerTV-style left rail: a list of popular competitions.
export default function Sidebar() {
  const { data: meta } = useData("meta.json", { refreshMs: 300000 });
  const { data: leaguesDoc } = useData("leagues.json", { refreshMs: 3600000 });

  const ids = meta?.priorityLeagues || [];
  const byId = new Map((leaguesDoc?.leagues || []).map((l) => [l.id, l]));

  return (
    <aside className="sidebar">
      <div className="rail-block">
        <h3 className="rail-title">Popular Competitions</h3>
        <ul className="rail-list">
          {ids.map((id) => {
            const l = byId.get(id);
            return (
              <li key={id}>
                <Link to={`/league/${id}`} className="rail-item">
                  {l?.flag || l?.logo ? (
                    <img src={l.flag || l.logo} alt="" loading="lazy" />
                  ) : (
                    <span className="rail-dot" />
                  )}
                  <span className="rail-name">{l?.name || `League ${id}`}</span>
                  <span className="rail-country">{l?.country || ""}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
