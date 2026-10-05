export function canWarmRoutes({ connection = {}, hidden = false } = {}) {
  return !hidden && !connection.saveData && !['slow-2g', '2g', '3g'].includes(connection.effectiveType);
}
