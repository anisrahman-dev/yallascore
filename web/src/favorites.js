import { useSyncExternalStore } from "react";

// localStorage key holding a JSON array of favorited fixture ids.
const KEY = "yalla:favs";
const EVENT = "yalla:favs"; // same-tab change notification

const norm = (id) => String(id);

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(ids) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage full/unavailable — ignore */
  }
}

// Single shared snapshot so every subscriber (all stars + the Favorites page)
// re-renders together on any change, within the same tab and across tabs.
let snapshot = read();
const listeners = new Set();

function emit() {
  snapshot = read();
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  // Cross-tab: storage event fires only in OTHER tabs.
  const onStorage = (e) => { if (e.key === KEY) emit(); };
  // Same-tab: our own custom event.
  const onLocal = () => emit();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onLocal);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, onLocal);
    }
  };
}

export function toggleFavorite(id) {
  const key = norm(id);
  const current = read();
  const exists = current.some((x) => norm(x) === key);
  const next = exists ? current.filter((x) => norm(x) !== key) : [...current, id];
  write(next);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
  else emit();
}

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  const isFav = (id) => favs.some((x) => norm(x) === norm(id));
  return { favs, isFav, toggle: toggleFavorite };
}

export default useFavorites;
