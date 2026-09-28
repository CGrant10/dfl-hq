import { describe, expect, it } from "vitest";
import { performanceFindings } from "../performance-findings.js";

describe("performance health", () => {
  it("ranks only metrics whose p75 misses its target", () => {
    const rows = [
      { metric: "route_render", route: "home", p75: 1600, unit: "ms" },
      { metric: "interaction_latency", route: "trade", p75: 120, unit: "ms" },
      { metric: "largest_contentful_paint", route: "home", p75: 3000, unit: "ms" },
    ];
    expect(performanceFindings(rows).map(row => row.metric)).toEqual(["route_render", "largest_contentful_paint"]);
  });
});
