import { Link } from "react-router-dom";
import { phase, statusLabel, kickoff } from "../util.js";
import StarButton from "../components/StarButton.jsx";

export default function MatchRow({ f }) {
  const p = phase(f.status);
  const started = p === "live" || p === "ht" || p === "finished";
  const homeWin = f.teams.home.winner;
  const awayWin = f.teams.away.winner;

  return (
    <Link to={`/match/${f.id}`} className="match">
      <div className={`match-status ${p}`}>
        {p === "scheduled" ? kickoff(f.date) : statusLabel(f.status)}
      </div>

      <div className="match-teams">
        <div className={`team ${homeWin ? "win" : ""}`}>
          <img src={f.teams.home.logo} alt="" loading="lazy" />
          <span className="team-name">{f.teams.home.name}</span>
        </div>
        <div className={`team ${awayWin ? "win" : ""}`}>
          <img src={f.teams.away.logo} alt="" loading="lazy" />
          <span className="team-name">{f.teams.away.name}</span>
        </div>
      </div>

      <div className="match-score">
        {started ? (
          <>
            <span className={homeWin ? "win" : ""}>{f.goals.home ?? 0}</span>
            <span className={awayWin ? "win" : ""}>{f.goals.away ?? 0}</span>
          </>
        ) : (
          <span className="vs">–</span>
        )}
      </div>

      <StarButton id={f.id} />
    </Link>
  );
}
