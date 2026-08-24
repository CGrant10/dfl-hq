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
