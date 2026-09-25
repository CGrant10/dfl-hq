import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const invoke = vi.fn();
const from = vi.fn();
vi.mock("./supabase.js", () => ({
  db: () => ({ from, rpc }),
  edge: () => ({ functions: { invoke } }),
  privilegedFunctionHeaders: () => ({ "x-admin-key": "test" }),
}));
vi.mock("./members.js", () => ({ currentMember: () => ({ id: 7 }) }));

import { createCustomBreakingAlert, customAlertViewModel, endCustomBreakingAlert } from "./custom-alerts.js";

describe("custom breaking alerts", () => {
  beforeEach(() => {
    rpc.mockReset(); invoke.mockReset(); from.mockReset();
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    vi.stubGlobal("CustomEvent", class { constructor(type) { this.type = type; } });
  });

  it("normalizes a saved alert for the shared banner", () => {
    expect(customAlertViewModel({ id: 4, label: " league alert ", title: " Waivers close tonight ", message: "Get your claims in.", target_url: "#/home", active: true }))
      .toMatchObject({ id: "custom-4", rawId: 4, kind: "custom", label: "LEAGUE ALERT", title: "Waivers close tonight", breakingActive: true });
  });

  it("rejects external destinations", () => {
    expect(customAlertViewModel({ id: 5, title: "Nope", target_url: "https://bad.example" }).href).toBe("#/home");
  });

  it("ends coverage through the commissioner-checked RPC", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(endCustomBreakingAlert(8)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("end_custom_breaking_alert", { alert_id: 8 });
  });

  it("creates a trimmed in-app alert without inventing an external destination", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 9, label: "LEAGUE ALERT", title: "Claims close", message: "Midnight.", target_url: "#/home", active: true }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    const result = await createCustomBreakingAlert({ title: "  Claims close  ", message: "Midnight.", targetUrl: "https://outside.example", sendPhone: false });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ title: "Claims close", target_url: "#/home", created_by: 7 }));
    expect(result.alert).toMatchObject({ id: "custom-9", title: "Claims close" });
    expect(invoke).not.toHaveBeenCalled();
  });
});
