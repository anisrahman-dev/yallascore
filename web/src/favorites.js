import { useCallback, useEffect, useState } from "react";

// localStorage key holding a JSON array of favorited fixture ids.
const KEY = "yalla:favs";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
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
    /* storage may be full or unavailable — fail silently */
  }
}

// Normalize ids so number/string mismatches still match.
const norm = (id) => String(id);

export function useFavorites() {
  const [favs, setFavs] = useState(read);

  // Sync across tabs/windows via the storage event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e) {
      if (e.key !== KEY) return;
      setFavs(read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isFav = useCallback(
    (id) => favs.some((x) => norm(x) === norm(id)),
    [favs]
  );

  const toggle = useCallback((id) => {
    setFavs((prev) => {
      const key = norm(id);
      const exists = prev.some((x) => norm(x) === key);
      const next = exists
        ? prev.filter((x) => norm(x) !== key)
        : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  return { favs, isFav, toggle };
}

export default useFavorites;
