export const SLEEPER_SYNC_DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeSleeperSchedule(slots = []) {
  const unique = new Map();
  for (const slot of slots || []) {
    const day = Number(slot?.day);
    const time = String(slot?.time || "").slice(0, 5);
    if (!Number.isInteger(day) || day < 0 || day > 6 || !VALID_TIME.test(time)) continue;
    unique.set(`${day}:${time}`, { day, time });
  }
  return [...unique.values()].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}

export function sleeperScheduleByDay(slots = []) {
  const days = Array.from({ length: 7 }, () => []);
  normalizeSleeperSchedule(slots).forEach(({ day, time }) => days[day].push(time));
  return days;
}

export function formatSleeperSyncTime(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
