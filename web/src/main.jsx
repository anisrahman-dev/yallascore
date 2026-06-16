import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import WorldCup from "./pages/WorldCup.jsx";
import MatchDetail from "./pages/MatchDetail.jsx";
import Team from "./pages/Team.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<WorldCup />} />
          <Route path="match/:id" element={<MatchDetail />} />
          <Route path="team/:id" element={<Team />} />
          <Route path="*" element={<WorldCup />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
