import { Link } from "react-router-dom";
import "./Footer.css";

const POPULAR_SEARCHES = [
  "yalla live football",
  "yalla live",
  "yalla shoot live scores",
  "yalla koora",
  "world cup 2026 live scores",
  "world cup 2026 fixtures",
  "world cup 2026 schedule",
  "world cup 2026 results",
  "world cup 2026 groups",
  "round of 32 bracket",
  "world cup final 2026",
  "football matches today",
  "live football scores",
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <section className="footer-about">
          <h2>About Yalla — World Cup 2026 Live Scores</h2>
          <p>
            Yalla is a fast, free live-scores app built for the FIFA World Cup
            2026 in the USA, Canada and Mexico. Think yalla live football,
            reimagined for the World Cup: real-time World Cup 2026 live scores,
            the complete fixtures and schedule, all 12 groups (A–L), the Round
            of 32 knockout bracket, team pages and final results. We cover all
            48 nations and 104 matches — from the opening match on 11 June 2026
            to the Final on 19 July — with live scores updated minute by minute.
            No sign-up, no clutter: just today's matches, results and fixtures
            the moment they happen.
          </p>
        </section>

        <nav className="footer-links" aria-label="Footer">
          <div className="footer-col">
            <h3>World Cup 2026</h3>
            <ul>
              <li><Link to="/">World Cup 2026 Schedule</Link></li>
              <li><Link to="/">Full Fixtures</Link></li>
              <li><Link to="/">Live Scores</Link></li>
              <li><Link to="/">Today's Matches</Link></li>
              <li><Link to="/">Latest Results</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Stages</h3>
            <ul>
              <li><Link to="/">Group Stage (Groups A–L)</Link></li>
              <li><Link to="/">Group Standings</Link></li>
              <li><Link to="/">Round of 32</Link></li>
              <li><Link to="/">Round of 16 &amp; Quarter-Finals</Link></li>
              <li><Link to="/">Semi-Finals &amp; Final</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Teams &amp; Hosts</h3>
            <ul>
              <li><Link to="/">All 48 World Cup Teams</Link></li>
              <li><Link to="/">USA, Canada &amp; Mexico (Hosts)</Link></li>
              <li><Link to="/">Team Fixtures &amp; Results</Link></li>
              <li><Link to="/">Top Scorers</Link></li>
              <li><Link to="/">Match Centre</Link></li>
            </ul>
          </div>
        </nav>

        <section className="footer-searches">
          <h3>Popular searches</h3>
          <ul className="tag-list">
            {POPULAR_SEARCHES.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </section>

        <p className="footer-copy">
          © 2026 Yalla · World Cup. Live World Cup 2026 scores, fixtures and
          results. Not affiliated with FIFA. All team names and logos belong to
          their respective owners.
        </p>
      </div>
    </footer>
  );
}
