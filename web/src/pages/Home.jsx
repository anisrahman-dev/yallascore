import { useMemo, useState } from "react";
import { useData } from "../api.js";
import { groupByLeague, dayLabel, phase } from "../util.js";
import LeagueGroup from "../components/LeagueGroup.jsx";
import LiveTicker from "../components/LiveTicker.jsx";

export default function Home() {
  const { data: meta } = useData("meta.json", { refreshMs: 300000 });
  const dates = meta?.dates;
  const priority = meta?.priorityLeagues || [];

  const dateOptions = dates ? [dates.yesterday, dates.today, dates.tomorrow] : [];
  const [selected, setSelected] = useState(null);
  const activeDate = selected || dates?.today;

  // Live data: poll often. Fixtures for the day: poll slower.
  const live = useData("live.json", { refreshMs: 60000 });
  const day = useData(activeDate ? `fixtures-${activeDate}.json` : "meta.json", {
    refreshMs: 90000,
  });

  const isToday = activeDate && dates && activeDate === dates.today;

  const liveFixtures = useMemo(() => {
    const fx = live.data?.fixtures || [];
    return fx.filter((f) => {
      const p = phase(f.status);
      return p === "live" || p === "ht";
    });
  }, [live.data]);

  const liveGroups = useMemo(
    () => groupByLeague(liveFixtures, priority),
    [liveFixtures, priority]
  );

  const dayGroups = useMemo(() => {
    if (!day.data?.fixtures) return [];
    return groupByLeague(day.data.fixtures, priority);
  }, [day.data, priority]);

  const liveCount = liveFixtures.length;

  const fullDate = activeDate
    ? new Date(activeDate + "T00:00:00").toLocaleDateString([], {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="page">
      <div className="schedule-head">
        <h1>Football on TV</h1>
        <span className="schedule-date">{fullDate}</span>
      </div>

      <LiveTicker />

      <div className="date-nav">
        {dateOptions.map((d) => (
          <button
            key={d}
            className={d === activeDate ? "date-btn active" : "date-btn"}
            onClick={() => setSelected(d)}
          >
            {dayLabel(d)}
          </button>
        ))}
      </div>

      {isToday && liveCount > 0 && (
        <div className="section">
          <h2 className="section-title">
            <span className="live-dot" /> Live now · {liveCount}
          </h2>
          {liveGroups.map((g) => (
            <LeagueGroup key={`live-${g.league.id}`} group={g} />
          ))}
        </div>
      )}

      <div className="section">
        <h2 className="section-title">{activeDate ? dayLabel(activeDate) : "Matches"}</h2>
        {day.loading && <div className="muted">Loading matches…</div>}
        {day.error && (
          <div className="muted">
            Couldn’t load matches. {String(day.error.message)}
          </div>
        )}
        {!day.loading && dayGroups.length === 0 && !day.error && (
          <div className="muted">No matches found for this day.</div>
        )}
        {dayGroups.map((g) => (
          <LeagueGroup key={g.league.id} group={g} />
        ))}
      </div>
    </div>
  );
}
