import { useMemo } from "react";
import { useData } from "../api.js";
import { groupByLeague } from "../util.js";
import { useFavorites } from "../favorites.js";
import LeagueGroup from "../components/LeagueGroup.jsx";
import "./Favorites.css";

export default function Favorites() {
  const { favs } = useFavorites();
  const favSet = useMemo(() => new Set(favs.map((x) => String(x))), [favs]);

  const { data: meta } = useData("meta.json", { refreshMs: 300000 });
  const dates = meta?.dates;
  const priority = meta?.priorityLeagues || [];

  // Live + the three day files. Each loads independently and is allowed to fail.
  const live = useData("live.json", { refreshMs: 60000 });
  const yday = useData(dates ? `fixtures-${dates.yesterday}.json` : "meta.json", {
    refreshMs: 0,
  });
  const today = useData(dates ? `fixtures-${dates.today}.json` : "meta.json", {
    refreshMs: 90000,
  });
  const tmrw = useData(dates ? `fixtures-${dates.tomorrow}.json` : "meta.json", {
    refreshMs: 0,
  });

  // Only treat day files as "real" once we have dates to key them by.
  const sources = dates
    ? [live.data, yday.data, today.data, tmrw.data]
    : [live.data];

  const groups = useMemo(() => {
    const byId = new Map();
    for (const src of sources) {
      const fx = src?.fixtures;
      if (!Array.isArray(fx)) continue;
      for (const f of fx) {
        if (!f || f.id == null) continue;
        if (!favSet.has(String(f.id))) continue;
        byId.set(String(f.id), f);
      }
    }
    return groupByLeague([...byId.values()], priority);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.data, yday.data, today.data, tmrw.data, favSet, priority, dates]);

  const loading =
    live.loading || (dates && (yday.loading || today.loading || tmrw.loading));
  const hasFavs = favs.length > 0;

  return (
    <div className="page">
      <div className="schedule-head">
        <h1>Favorites</h1>
        <span className="schedule-date">{favs.length} starred</span>
      </div>

      {!hasFavs && (
        <div className="fav-empty">
          <div className="fav-empty-star" aria-hidden="true">★</div>
          <p className="fav-empty-title">No favorites yet</p>
          <p className="muted">
            Tap the star on any match to follow it. Your favorites appear here.
          </p>
        </div>
      )}

      {hasFavs && (
        <div className="section">
          {loading && groups.length === 0 && (
            <div className="muted">Loading your matches…</div>
          )}
          {!loading && groups.length === 0 && (
            <div className="fav-empty">
              <p className="fav-empty-title">Nothing to show right now</p>
              <p className="muted">
                Your favorited matches aren’t in the current schedule
                (yesterday–tomorrow). Check back around kickoff.
              </p>
            </div>
          )}
          {groups.map((g) => (
            <LeagueGroup key={g.league.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
