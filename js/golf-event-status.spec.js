import { describe, expect, it } from "vitest";
import { golfEventStatus } from "./golf-event-status.js";
const now = new Date(2026, 9, 2, 12);
describe("golf list lifecycle", () => {
  it("uses the active Quick Round when its outing still says setup", () => {
    expect(golfEventStatus({ status: "setup", event_date: "2026-08-24" }, { roundStatus: "active", now }))
      .toMatchObject({ label: "Unfinished round", group: "current" });
  });
  it("honors a finalized round when the outing update lags", () => {
    expect(golfEventStatus({ status: "setup" }, { roundStatus: "final", now })).toMatchObject({ label: "Final", group: "history" });
  });
  it("distinguishes a future scheduled event from a past unfinalized event", () => {
    expect(golfEventStatus({ status: "setup", event_date: "2026-10-10" }, { now }).label).toBe("Upcoming");
    expect(golfEventStatus({ status: "setup", event_date: "2026-08-24" }, { now }).label).toBe("Past event · not finalized");
  });
  it("does not call a current round unfinished on its scheduled day", () => {
    expect(golfEventStatus({ status: "active", event_date: "2026-10-02" }, { now }).label).toBe("In progress");
  });
});
