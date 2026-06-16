import { useState } from "react";
import "./MatchExtras.css";

// Pull a "home – away" string from a score slot if both sides are present.
function scoreLine(slot) {
  if (!slot) return null;
  const { home, away } = slot;
  if (home == null && away == null) return null;
  return `${home ?? 0} – ${away ?? 0}`;
}

export default function MatchExtras({ f }) {
  const [copied, setCopied] = useState(false);

  const score = f?.score || {};
  const rows = [
    { label: "Half-time", value: scoreLine(score.halftime) },
    { label: "Full-time", value: scoreLine(score.fulltime) },
    { label: "Extra-time", value: scoreLine(score.extratime) },
    { label: "Penalties", value: scoreLine(score.penalty) },
  ].filter((r) => r.value != null);

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const canCopy =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function";

  // Nothing to show and no way to share: render nothing.
  if (rows.length === 0 && !canShare && !canCopy) return null;

  async function handleShare() {
    const url =
      typeof location !== "undefined" ? location.href : "";
    const title =
      f?.teams?.home?.name && f?.teams?.away?.name
        ? `${f.teams.home.name} vs ${f.teams.away.name}`
        : "Match";

    try {
      if (canShare) {
        await navigator.share({ title, url });
        return;
      }
      if (canCopy) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // User cancelled the share sheet or the action failed; ignore.
    }
  }

  const showShare = canShare || canCopy;

  return (
    <div className="mextras-card">
      <div className="mextras-head">
        <h3 className="mextras-title">Score breakdown</h3>
        {showShare && (
          <button
            type="button"
            className="mextras-share"
            onClick={handleShare}
          >
            {copied ? "Link copied" : "Share"}
          </button>
        )}
      </div>

      {rows.length > 0 ? (
        <ul className="mextras-rows">
          {rows.map((r) => (
            <li key={r.label} className="mextras-row">
              <span className="mextras-label">{r.label}</span>
              <span className="mextras-value">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mextras-empty">No score breakdown available yet.</p>
      )}
    </div>
  );
}
