import "./UIStates.css";

export function Skeleton({ width = "100%", height = 16, radius = 4, count = 1 }) {
  const n = Math.max(1, count | 0);
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push(
      <span
        key={i}
        className="ui-skeleton"
        style={{
          width,
          height: typeof height === "number" ? `${height}px` : height,
          borderRadius: typeof radius === "number" ? `${radius}px` : radius,
        }}
      />
    );
  }
  return <span className="ui-skeleton-wrap" aria-hidden="true">{items}</span>;
}

export function EmptyState({ icon = "⚽", title = "Nothing here yet", message }) {
  return (
    <div className="ui-empty" role="status">
      {icon ? <div className="ui-empty-icon">{icon}</div> : null}
      <div className="ui-empty-title">{title}</div>
      {message ? <div className="ui-empty-message">{message}</div> : null}
    </div>
  );
}
