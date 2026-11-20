// Time and difficulty helpers for the trophy guide. One job: turn raw
// minutes and 1-5 difficulty numbers into the words the UI shows.

export const DIFFICULTY_LABELS = {
  1: "Easy",
  2: "Relaxed",
  3: "Involved",
  4: "Demanding",
  5: "Marathon",
};

export function difficultyLabel(n) {
  return DIFFICULTY_LABELS[n] || "Unknown";
}

// 45 -> "~45m", 150 -> "~2h 30m", 0 -> "—"
export function formatMinutes(mins) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return "~" + m + "m";
  if (m === 0) return "~" + h + "h";
  return "~" + h + "h " + m + "m";
}

// Sum of est_minutes over a list of trophies.
export function totalMinutes(trophies) {
  return trophies.reduce((sum, t) => sum + (t.est_minutes || 0), 0);
}

// Minutes left across trophies the player has not earned yet.
export function remainingMinutes(trophies, earnedIds) {
  return trophies
    .filter((t) => !earnedIds.has(t.id))
    .reduce((sum, t) => sum + (t.est_minutes || 0), 0);
}
