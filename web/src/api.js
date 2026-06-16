import { useEffect, useRef, useState } from "react";

// Where JSON data lives. In production this is the raw GitHub URL set via
// VITE_DATA_BASE at build time. In dev it falls back to /data (put sample
// files in web/public/data/ if you want to work offline).
const RAW = import.meta.env.VITE_DATA_BASE || "/data";
export const DATA_BASE = RAW.replace(/\/$/, "");

export async function getJSON(file, { signal } = {}) {
  // 30s cache-buster keeps live data reasonably fresh without hammering CDN.
  const bust = Math.floor(Date.now() / 30000);
  const res = await fetch(`${DATA_BASE}/${file}?t=${bust}`, { signal });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

// React hook: loads `file`, optionally re-polling every `refreshMs`.
export function useData(file, { refreshMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fileRef = useRef(file);
  fileRef.current = file;

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function load(initial) {
      if (initial) setState((s) => ({ ...s, loading: true }));
      try {
        const data = await getJSON(fileRef.current, { signal: ctrl.signal });
        if (alive) setState({ data, error: null, loading: false });
      } catch (e) {
        if (alive && e.name !== "AbortError")
          setState((s) => ({ ...s, error: e, loading: false }));
      }
    }

    load(true);
    let timer;
    if (refreshMs > 0) timer = setInterval(() => load(false), refreshMs);

    return () => {
      alive = false;
      ctrl.abort();
      if (timer) clearInterval(timer);
    };
  }, [file, refreshMs]);

  return state;
}
