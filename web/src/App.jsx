import { NavLink, Outlet } from "react-router-dom";
import { useData } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";

function freshness(meta) {
  if (!meta?.updatedAt) return null;
  const mins = Math.round((Date.now() - new Date(meta.updatedAt).getTime()) / 60000);
  if (mins < 1) return "updated just now";
  if (mins < 60) return `updated ${mins} min ago`;
  const h = Math.round(mins / 60);
  return `updated ${h}h ago`;
}

export default function App() {
  const { data: meta } = useData("meta.json", { refreshMs: 120000 });

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark">YALLA</span>
            <span className="brand-sub">SOCCER TV</span>
          </NavLink>
          <nav className="tabs">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "tab active" : "tab")}>
              🏆 World Cup
            </NavLink>
            <NavLink to="/matches" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
              Matches
            </NavLink>
            <NavLink to="/standings" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
              Competitions
            </NavLink>
            <NavLink to="/scorers" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
              Scorers
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
              Search
            </NavLink>
            <NavLink to="/favorites" className={({ isActive }) => (isActive ? "tab active" : "tab")}>
              ★ Favorites
            </NavLink>
          </nav>
          <span className="freshness">{freshness(meta)}</span>
        </div>
      </header>

      <div className="layout">
        <Sidebar />
        <main className="content">
          <Outlet />
        </main>
      </div>

      <footer className="footer">
        Data from API-Football · scores may be delayed a few minutes
      </footer>
    </div>
  );
}
