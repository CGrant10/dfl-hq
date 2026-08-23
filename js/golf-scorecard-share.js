import { shareText } from "./share.js";

const clean = value => String(value || "").replace(/\s+/g, " ").trim();

export function shareScorecard(card, fallbackTitle = "Golf scorecard") {
  const title = clean(card?.querySelector("h2")?.textContent) || fallbackTitle;
  const context = [...(card?.querySelectorAll(".gqm-scorecard-title p,.gqm-scorecard-title strong") || [])]
    .map(node => clean(node.textContent)).filter(Boolean);
  const headers = [...(card?.querySelectorAll("table thead th") || [])].slice(1).map(node => clean(node.textContent));
  const rows = [...(card?.querySelectorAll("table tbody tr") || [])].map(row => {
    const name = clean(row.querySelector("th")?.textContent) || "Golfer";
    const values = [...row.querySelectorAll("td")].map(node => clean(node.textContent) || "—");
    return `${name}: ${values.map((value, index) => `${headers[index] || index + 1} ${value}`).join(" · ")}`;
  });
  return shareText({ title, text: [title, ...context, ...rows].filter(Boolean).join("\n"), url: location.href });
}
