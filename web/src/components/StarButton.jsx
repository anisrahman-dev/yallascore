import { useFavorites } from "../favorites.js";
import "./StarButton.css";

export default function StarButton({ id }) {
  const { isFav, toggle } = useFavorites();
  const active = isFav(id);

  function onClick(e) {
    // Lives inside <Link> rows — don't navigate when starring.
    e.preventDefault();
    e.stopPropagation();
    toggle(id);
  }

  const label = active ? "Remove from favorites" : "Add to favorites";

  return (
    <button
      type="button"
      className={`star-btn${active ? " active" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 17.27 6.18 21l1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.82 4.73L17.82 21z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
