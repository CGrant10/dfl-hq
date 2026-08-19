import { describe, expect, it } from "vitest";
import { focusShouldPause, shouldRun, STAGE_CONTROL } from "./broadcast-stage.js";

/* A stand-in for a DOM node: only closest() is used, and only against the
   control selector, so this is the whole surface the decision touches. */
const el = (matches) => ({ closest: (sel) => (sel === STAGE_CONTROL && matches ? {} : null) });

describe("broadcast stage autoplay", () => {
  it("does NOT pause when focus lands on a nav control", () => {
    /*
      THE BUG. Clicking the next arrow focuses that arrow. focusin fired, the
      "focus" soft pause went on, and focusout only clears it when focus leaves
      the stage entirely - which it never does, because the button you just
      pressed is inside the stage. One arrow press killed the rotation for the
      rest of the visit, on every device.
    */
    expect(focusShouldPause(el(true))).toBe(false);
  });

  it("still pauses when focus is on the slide itself", () => {
    // The reason the pause exists: a keyboard user reading a slide should not
    // be yanked to the next one.
    expect(focusShouldPause(el(false))).toBe(true);
  });

  it("guards a missing element, and treats an unrecognisable one as content", () => {
    // No element, nothing to pause for.
    expect(focusShouldPause(null)).toBe(false);
    expect(focusShouldPause(undefined)).toBe(false);
    /*
      A target with no closest() is not a control, so it counts as content and
      pauses. That is the safe direction and it cannot re-create the latch: a
      thing that is not an element cannot hold focus, so there is nothing for
      focusout to fail to clear.
    */
    expect(focusShouldPause({})).toBe(true);
  });

  it("runs only with more than one slide and nothing holding it", () => {
    expect(shouldRun({ count: 4 })).toBe(true);
    expect(shouldRun({ count: 1 })).toBe(false);
    expect(shouldRun({ count: 0 })).toBe(false);
    expect(shouldRun()).toBe(false);
  });

  it("stops for any single reason, and needs all of them clear", () => {
    expect(shouldRun({ count: 4, dead: true })).toBe(false);
    expect(shouldRun({ count: 4, userPaused: true })).toBe(false);
    /* softSize covers hover, focus and hidden. A hidden tab is why this whole
       decision cannot be observed in a headless browser - the page correctly
       refuses to rotate, so a test that drives a real stage proves nothing. */
    expect(shouldRun({ count: 4, softSize: 1 })).toBe(false);
    expect(shouldRun({ count: 4, softSize: 3 })).toBe(false);
    expect(shouldRun({ count: 4, dead: false, userPaused: false, softSize: 0 })).toBe(true);
  });
});
