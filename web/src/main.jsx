import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Standings from "./pages/Standings.jsx";
import TopScorers from "./pages/TopScorers.jsx";
import MatchDetail from "./pages/MatchDetail.jsx";
import League from "./pages/League.jsx";
import Team from "./pages/Team.jsx";
import Search from "./pages/Search.jsx";
import Favorites from "./pages/Favorites.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="standings" element={<Standings />} />
          <Route path="scorers" element={<TopScorers />} />
          <Route path="match/:id" element={<MatchDetail />} />
          <Route path="league/:id" element={<League />} />
          <Route path="team/:id" element={<Team />} />
          <Route path="search" element={<Search />} />
          <Route path="favorites" element={<Favorites />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
