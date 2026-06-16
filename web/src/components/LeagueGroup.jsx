import MatchRow from "./MatchRow.jsx";

export default function LeagueGroup({ group }) {
  const { league, fixtures } = group;
  return (
    <section className="league-group">
      <header className="league-head">
        {league.flag || league.logo ? (
          <img src={league.flag || league.logo} alt="" loading="lazy" />
        ) : null}
        <div className="league-meta">
          <span className="league-country">{league.country}</span>
          <span className="league-name">{league.name}</span>
        </div>
      </header>
      <div className="match-list">
        {fixtures.map((f) => (
          <MatchRow key={f.id} f={f} />
        ))}
      </div>
    </section>
  );
}
