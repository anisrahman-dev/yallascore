import { NavLink, Outlet } from "react-router-dom";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark">YALLA</span>
            <span className="brand-sub">WORLD CUP</span>
          </NavLink>
        </div>
      </header>

      <main className="content content-full">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
