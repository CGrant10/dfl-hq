export const IMAGE_FITS = new Set(["cover", "contain"]);
export const IMAGE_X = new Set(["left", "center", "right"]);
export const IMAGE_Y = new Set(["top", "center", "bottom"]);

export function artworkSettings(row = {}) {
  return {
    imageFit: IMAGE_FITS.has(row.image_fit) ? row.image_fit : "cover",
    imageX: IMAGE_X.has(row.image_position_x) ? row.image_position_x : "center",
    imageY: IMAGE_Y.has(row.image_position_y) ? row.image_position_y : "center",
  };
}

// Every value has passed a closed allow-list above, so this string can be
// placed in a style attribute without carrying arbitrary database content.
export function artworkStyle(item = {}) {
  const settings = artworkSettings({
    image_fit: item.imageFit,
    image_position_x: item.imageX,
    image_position_y: item.imageY,
  });
  return `object-fit:${settings.imageFit};object-position:${settings.imageX} ${settings.imageY}`;
}

/** The background modes broadcast-stage.js knows how to draw. */
export const BACKGROUNDS = new Set(["default", "light", "dark", "image", "logo"]);

/*
  A PICTURE ON A SLIDE MEANS THE SLIDE HAS A PICTURE.

  backdrop() in broadcast-stage.js only draws artwork when background is
  'image', so a commissioner who chose a picture and left the plate alone got
  a slide with no picture on it and nothing on screen to say why. Every other
  path already pairs the two - applyOverride() and the champion generators in
  broadcast-deck.js all set background:"image" the moment they have art - so
  this is the hand-written row catching up rather than a new rule.

  An explicit choice still wins: dark, light or crest was a decision and is
  left alone. 'default' is what the column says when nobody decided, and so it
  is the only value a picture is allowed to answer for.
*/
export function slideBackground(row = {}) {
  const chosen = BACKGROUNDS.has(row.background) ? row.background : "default";
  if (chosen === "default" && row.image) return "image";
  return chosen;
}
