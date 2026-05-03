const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

export function getProjectUpdatedLabel(value: Date | string) {
  const updatedAt = typeof value === "string" ? new Date(value) : value;
  const timestamp = updatedAt.getTime();

  if (Number.isNaN(timestamp)) {
    return "Updated recently";
  }

  const diffMs = Math.max(0, Date.now() - timestamp);

  if (diffMs < MINUTE_IN_MS) {
    return "Updated just now";
  }

  if (diffMs < DAY_IN_MS) {
    return "Updated today";
  }

  if (diffMs < 2 * DAY_IN_MS) {
    return "Updated yesterday";
  }

  if (diffMs < 7 * DAY_IN_MS) {
    return `Updated ${Math.floor(diffMs / DAY_IN_MS)} days ago`;
  }

  return `Updated ${updatedAt.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  })}`;
}
