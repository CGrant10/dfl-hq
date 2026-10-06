import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// Exercise the production renderer without booting the browser/database app.
const source = readFileSync(new URL("./engagement-home.js", import.meta.url), "utf8");
const renderer = source.slice(source.indexOf("async function paintReactions("), source.indexOf("async function onReactionClick("));
function setup({ modern = false, request = Promise.resolve({ data: [] }) } = {}) {
  const bar = { innerHTML: "Wall controls" };
  const state = { modern };
  const post = { dataset: { wallPost: "7" }, querySelector: selector => selector === ".wall-reaction-buttons" ? state.modern ? {} : null : bar };
  const wall = { dataset: {}, isConnected: true };
  const root = { querySelectorAll: () => [post], querySelector: () => wall };
  const read = vi.fn(() => request);
  const db = () => ({ from: () => ({ select: () => ({ in: read }) }) });
  const paint = Function("db", "currentMember", "homeNow", "esc", `let reactionToken=0; const REACTIONS=['😂']; const REACTION_SCHEMA_MISSING=/missing/; ${renderer}; return paintReactions;`)(db, () => null, () => true, value => value);
  return { root, state, bar, read, paint };
}

describe("Home reaction ownership", () => {
  it("leaves the Wall's existing controls and loader alone", async () => {
    const context = setup({ modern: true });
    await context.paint(context.root);
    expect(context.read).not.toHaveBeenCalled();
    expect(context.bar.innerHTML).toBe("Wall controls");
  });

  it("does not replace Wall controls that arrive while a legacy request is pending", async () => {
    let finish;
    const request = new Promise(resolve => { finish = resolve; });
    const context = setup({ request });
    const pending = context.paint(context.root);
    expect(context.read).toHaveBeenCalledOnce();
    context.state.modern = true;
    finish({ data: [] });
    await pending;
    expect(context.bar.innerHTML).toBe("Wall controls");
  });
});
