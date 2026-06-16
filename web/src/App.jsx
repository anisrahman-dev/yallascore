import { NavLink, Outlet } from "react-router-dom";
import { useData } from "./api.js";

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
            <span className="brand-sub">WORLD CUP</span>
          </NavLink>
          <span className="freshness">{freshness(meta)}</span>
        </div>
      </header>

      <main className="content content-full">
        <Outlet />
      </main>

      <footer className="footer">
        Data from API-Football · scores may be delayed a few minutes
      </footer>
    </div>
  );
}
