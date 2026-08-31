import { describe, expect, it } from "vitest";
import {
  PRIMARY_SEASON_ROUTES,
  SECONDARY_SEASON_ROUTES,
  primarySeasonNavMarkup,
  secondarySeasonNavMarkup,
} from "./season-nav.js";

describe("regular-season navigation", () => {
  it("puts trade analysis in the primary bar with the weekly league tools", () => {
    expect(PRIMARY_SEASON_ROUTES.map((item) => item.route))
      .toEqual(["home", "rules", "analyzer", "facts", "finances"]);
    expect(PRIMARY_SEASON_ROUTES.find((item) => item.lead)?.route).toBe("analyzer");
  });

  it("keeps completed-season and occasional tools in More", () => {
    const secondary = SECONDARY_SEASON_ROUTES.map((item) => item.route);
    expect(secondary).toEqual(expect.arrayContaining(["keepers", "golf", "polls", "admin"]));
    expect(secondary).not.toContain("analyzer");
  });

  it("renders unique routes and a More control", () => {
    const routes = [...PRIMARY_SEASON_ROUTES, ...SECONDARY_SEASON_ROUTES].map((item) => item.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(primarySeasonNavMarkup()).toContain('id="more-btn"');
    expect(primarySeasonNavMarkup()).toContain('data-route="analyzer"');
    expect(secondarySeasonNavMarkup()).toContain('href="#/golf"');
  });
});

