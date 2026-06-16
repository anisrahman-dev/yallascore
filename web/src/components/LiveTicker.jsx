import { Link } from "react-router-dom";
import { useData } from "../api.js";
import { phase, statusLabel } from "../util.js";
import "./LiveTicker.css";

// Horizontal strip of currently-live matches. Renders nothing when there are
// no live fixtures (or the data file is missing/empty). Refreshes every 60s.
export default function LiveTicker() {
  const { data } = useData("live.json", { refreshMs: 60000 });

  const fixtures = Array.isArray(data?.fixtures) ? data.fixtures : [];
  const live = fixtures.filter((f) => {
    const p = phase(f?.status);
    return p === "live" || p === "ht";
  });

  if (live.length === 0) return null;

  return (
    <div className="liveticker">
      <div className="liveticker-scroll">
        {live.map((f) => (
          <Link
            key={f.id}
            to={`/match/${f.id}`}
            className="liveticker-card"
            title={`${f.teams?.home?.name} vs ${f.teams?.away?.name}`}
          >
            <div className="liveticker-top">
              {(f.league?.flag || f.league?.logo) && (
                <img
                  className="liveticker-comp"
                  src={f.league.flag || f.league.logo}
                  alt=""
                  loading="lazy"
                />
              )}
              <span className="liveticker-min">{statusLabel(f.status)}</span>
            </div>

            <div className="liveticker-row">
              <span className="liveticker-team">{f.teams?.home?.name}</span>
              <span className="liveticker-goal">{f.goals?.home ?? 0}</span>
            </div>
            <div className="liveticker-row">
              <span className="liveticker-team">{f.teams?.away?.name}</span>
              <span className="liveticker-goal">{f.goals?.away ?? 0}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
