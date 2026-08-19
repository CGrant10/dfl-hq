import { describe, expect, it } from "vitest";
import { activityLine, whenText, activityCard } from "./activity.js";
const NOW = Date.parse("2026-08-19T12:00:00Z");
const at = (mins) => new Date(NOW - mins * 60000).toISOString();

describe("activity feed lines", () => {
  it("folds a batch into one countable sentence", () => {
    const l = activityLine({ entity: "keepers", label: "keeper", action: "update",
      member_id: 3, display_name: "Grant", row_count: 12, last_at: at(2) }, { now: NOW });
    expect(l.who).toBe("Grant");
    expect(l.text).toBe("changed 12 keepers");
  });

  it("says 'a thing' for a single row and does not double a plural", () => {
    expect(activityLine({ entity: "polls", label: "poll", action: "insert", row_count: 1,
      last_at: at(1) }, { now: NOW }).text).toBe("added a poll");
    /* "keeper rules" already ends in s; "1 keeper ruless" was the bug this
       guards against. */
    expect(activityLine({ entity: "keeper_rules", label: "keeper rules", action: "update",
      row_count: 3, last_at: at(1) }, { now: NOW }).text).toBe("changed 3 keeper rules");
  });

  it("reads as a sentence for a table it has never heard of", () => {
    const l = activityLine({ entity: "some_new_table", action: "insert", row_count: 1,
      last_at: at(1) }, { now: NOW });
    expect(l.text).toBe("added a some new table");
    expect(l.who).toBe("Somebody");
  });

  it("degrades time only as far as it is honest", () => {
    expect(whenText(at(0.2), NOW)).toBe("just now");
    expect(whenText(at(5), NOW)).toBe("5 min ago");
    expect(whenText(at(180), NOW)).toBe("3 hr ago");
    expect(whenText(at(60 * 24), NOW)).toBe("yesterday");
    expect(whenText(at(60 * 24 * 4), NOW)).toBe("4 days ago");
    /* Past a fortnight it becomes a date rather than counting weeks at
       somebody - nobody thinks in "9 weeks ago". */
    expect(whenText(at(60 * 24 * 90), NOW)).toMatch(/[A-Z][a-z]{2}/);
    expect(whenText("not a date", NOW)).toBe("");
  });

  it("draws nothing at all when the migration is absent", () => {
    // null means "not installed" and must not put an empty card on the front
    // page of a league that never asked for the feature.
    expect(activityCard(null)).toBe("");
    expect(activityCard([])).toContain("Nothing yet.");
  });

  it("marks a commissioner write and links a known member", () => {
    const html = activityCard([{ entity: "keepers", label: "keeper", action: "update",
      member_id: 7, display_name: "Grant", as_commissioner: true, row_count: 1, last_at: at(3) }]);
    expect(html).toContain('href="#/profile?id=7"');
    expect(html).toContain("act-badge");
    const plain = activityCard([{ entity: "polls", label: "poll", action: "insert",
      member_id: null, display_name: null, as_commissioner: false, row_count: 1, last_at: at(3) }]);
    expect(plain).not.toContain("act-badge");
    expect(plain).toContain("Somebody");
  });
});
