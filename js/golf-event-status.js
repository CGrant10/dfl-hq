// Presentation only: never rewrite a stored event or mark scores final.
export function golfEventStatus(outing, { roundStatus = "", now = new Date() } = {}) {
  if (outing.status === "final" || roundStatus === "final") return { label: "Final", tone: "grey", group: "history" };
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const date = String(outing.event_date || "").slice(0, 10);
  const past = /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today;
  if (outing.status === "active" || roundStatus === "active") {
    return { label: past ? "Unfinished round" : "In progress", tone: past ? "warn" : "green", group: "current" };
  }
  return { label: past ? "Past event · not finalized" : "Upcoming", tone: "warn", group: past ? "current" : "upcoming" };
}
