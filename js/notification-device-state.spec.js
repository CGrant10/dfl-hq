import { describe, expect, it } from "vitest";
import { notificationIntent, rememberNotificationCategories, rememberNotificationIntent, rememberedNotificationCategories, shouldRepairMissingSubscription } from "./notification-device-state.js";
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) }; };
describe("notification device state", () => {
  it("keeps an explicit on/off choice per member", () => { const storage = memory(); rememberNotificationIntent(7, true, storage); rememberNotificationIntent(8, false, storage); expect(notificationIntent(7, storage)).toBe(true); expect(notificationIntent(8, storage)).toBe(false); });
  it("repairs only granted devices that were on or have a legacy token", () => {
    expect(shouldRepairMissingSubscription({ permission: "granted", desired: true, hasDeviceToken: false })).toBe(true);
    expect(shouldRepairMissingSubscription({ permission: "granted", desired: null, hasDeviceToken: true })).toBe(true);
    expect(shouldRepairMissingSubscription({ permission: "granted", desired: false, hasDeviceToken: true })).toBe(false);
    expect(shouldRepairMissingSubscription({ permission: "denied", desired: true, hasDeviceToken: true })).toBe(false);
  });
  it("remembers alert categories through endpoint rotation", () => { const storage = memory(); rememberNotificationCategories(7, ["trades", "scores"], storage); expect(rememberedNotificationCategories(7, storage)).toEqual(["trades", "scores"]); });
});
