import { describe, expect, it } from "vitest";
import { fitSize, focusShouldPause, renderItem, renderStage, sameStageItem, shouldRun, STAGE_CONTROL } from "./broadcast-stage.js";

describe("editorial Home broadcast", () => {
  it('shows actual traded players with a labeled balance instead of a generic crest', () => {
    const item={kind:'trade',treatment:'stat',figure:'82%',href:'#/trade?id=3',tradeStory:{packages:[{teamName:'A & B',players:[{id:'7564',name:'Chase'}]},{teamName:'C',players:[{id:'6794',name:'Jefferson'}]}],outcome:{grade:'Close win'}}};
    const html=renderItem(item,{editorial:true});
    expect(html).toContain('value balance');
    expect(html).toContain('thumb/7564.jpg');
    expect(html).toContain('A &amp; B sends');
    expect(html).not.toContain('dfl-daily-crest');
  });
  it('keeps an archive number readable without making a long username the headline', () => {
    const html=renderItem({kind:'record',storyKind:'nailbiter',treatment:'stat',figure:.04000000001,headline:'Won by 0.04',subtitle:'Winner — long_handle 102.00 – 101.96 Opponent',href:'#/history'},{editorial:true});
    expect(html).toContain('>0.04</strong>');
    expect(html).toContain('Closest finish');
    expect(html).toContain('long_handle');
    expect(html).not.toContain('dfl-daily-crest');
  });
  it("uses champion artwork without a splatter while retaining the winner and destination", () => {
    const item = { treatment: "champion", headline: "Winner & Co", kicker: "2025 Champion", href: "#/history" };
    const html = renderItem(item, { editorial: true });
    expect(html).toContain("assets/dfl-daily-champion.webp");
    expect(html).not.toContain("bx-editorial-splatter");
    expect(html).toContain("Winner &amp; Co");
    expect(html).toContain('href="#/history"');
    expect(renderItem({ ...item, image: "https://example.com/winner.webp", background: "image", imageZoom: 2 }, { editorial: true })).toContain('--bx-zoom:2');
  });
  it("gives the Chip Eater its own illustration even when a member portrait is available", () => {
    const item = { treatment: "champion", variant: "chip", headline: "Last place", image: "https://example.com/member.webp", background: "image" };
    expect(renderItem(item, { editorial: true })).toContain("assets/dfl-daily-chip-eater.webp");
    expect(renderItem(item, { editorial: true })).not.toContain("example.com/member.webp");
    expect(renderItem(item)).toContain("example.com/member.webp");
  });
  const side = (id, name, score) => ({ id, name, score, status: "Live", mode: "live" });
  const slate = { treatment: "slate", kicker: "2026 · Week 4", href: "#/analyzer", fixtures: [
    { key: "a:b", a: side("a", "First & Co", "66.1"), b: side("b", "Second", "75.5") },
    { key: "c:d", a: side("c", "Third", "80.0"), b: side("d", "Fourth", "90.0") },
  ] };
  it("links the compact opening fixture to every league matchup and preserves live score keys", () => {
    const html = renderStage([slate], { editorial: true });
    expect(html).toContain('href="#/clubhouse?tab=matchups"');
    expect(html).toContain('data-live-key="slate:a:b:a"');
    expect(html).toContain('data-live-score="66.1"');
    expect(html).toContain("First &amp; Co");
    expect(html).not.toContain("Third");
    expect(html).not.toContain("bx-weave");
  });
  it("keeps the complete slate and artwork for other broadcast surfaces", () => {
    const html = renderStage([slate]);
    expect(html).toContain('href="#/analyzer"');
    expect(html).toContain("Third");
    expect(html).toContain("bx-weave");
  });
});

/* A stand-in for a DOM node: only closest() is used, and only against the
   control selector, so this is the whole surface the decision touches. */
const el = (matches) => ({ closest: (sel) => (sel === STAGE_CONTROL && matches ? {} : null) });

describe("broadcast stage autoplay", () => {
  it("does not repaint an unchanged active card when other cards join the deck", () => {
    const matchup = { id: "mine-2", generator: "myMatchup", headline: "Your matchup", sides: [{ score: "12.4" }] };
    expect(sameStageItem(matchup, { ...matchup, sides: [{ score: "12.4" }] })).toBe(true);
    expect(sameStageItem(matchup, { ...matchup, sides: [{ score: "14.8" }] })).toBe(false);
  });

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

describe("fitting a team name onto one line", () => {
  it("leaves a name that already fits completely alone", () => {
    /* null means "do not touch it". A headline that fits must keep the size the
       stylesheet gave it, or every short name would be silently rewritten in an
       inline style and stop responding to the type scale. */
    expect(fitSize(40, 180, 300)).toBe(null);
    expect(fitSize(40, 300, 300)).toBe(null);
  });

  it("shrinks by the exact ratio it is over by", () => {
    /* 600px of text in a 300px box is twice too wide, so half the size - less a
       hair, because a font-size that lands exactly on the boundary re-wraps on
       a fractional-pixel layout. */
    const got = fitSize(40, 600, 300);
    expect(got).toBeLessThan(20);
    expect(got).toBeGreaterThan(19.5);
  });

  it("gives up rather than shrink a name into a caption", () => {
    /*
      THE CASE THAT MATTERS. A three-word team name on a narrow phone can be
      four times too wide; fitting it would mean 10px type. Returning null hands
      wrapping back, because two readable lines beat one unreadable one - the
      fix for wrapping must not be worse than the wrapping.
    */
    expect(fitSize(40, 1600, 300)).toBe(null);
  });

  it("refuses to divide by a measurement it did not get", () => {
    /* A slide measured while hidden reports zeros. Every one of these would
       otherwise produce NaN or Infinity and be written straight into a style. */
    expect(fitSize(0, 600, 300)).toBe(null);
    expect(fitSize(40, 0, 300)).toBe(null);
    expect(fitSize(40, 600, 0)).toBe(null);
  });
});
