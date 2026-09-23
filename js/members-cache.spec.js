import { describe, expect, it, vi } from "vitest";

const rows = [
  { id: 1, display_name: "Active", active: true, sort_order: 1 },
  { id: 2, display_name: "Former", active: false, sort_order: 2 },
];
const builder = {
  select: vi.fn(() => builder),
  order: vi.fn(() => builder),
  then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject); },
};
const from = vi.fn(() => builder);

vi.mock("./supabase.js", () => ({ configured: true, db: () => ({ from }) }));

import { loadMemberDirectory, loadMembers } from "./members.js";

describe("shared member directory", () => {
  it("shares one request and derives active members from the complete rows", async () => {
    const [directory, active, again] = await Promise.all([
      loadMemberDirectory(), loadMembers(), loadMemberDirectory(),
    ]);

    expect(from).toHaveBeenCalledTimes(1);
    expect(directory).toEqual(rows);
    expect(again).toBe(directory);
    expect(active.map(member => member.id)).toEqual([1]);
  });
});
