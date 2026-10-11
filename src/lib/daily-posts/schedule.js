import { IRELAND_TIME_ZONE } from "@/lib/comic/schedule";

// Irish-time windows; endHour is exclusive.
export const DAILY_POST_SLOTS = {
  gm: { startHour: 8, endHour: 9 },
  gd: { startHour: 16, endHour: 18 },
  gn: { startHour: 20, endHour: 22 },
};

export const DAILY_POST_TYPES = Object.keys(DAILY_POST_SLOTS);

// Keep daily posts clear of the hourly comic pages and the nightly recap.
const COMIC_GAP_MINUTES = 10;
const STALE_GRACE_MINUTES = 60;
const MIN_LEAD_MS = 2 * 60_000;

function dublinParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IRELAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: values.weekday,
  };
}

export function getDublinDate(date = new Date()) {
  const { year, month, day } = dublinParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getDublinClock(date = new Date()) {
  const parts = dublinParts(date);
  return {
    date: getDublinDate(date),
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
    weekday: parts.weekday,
    isWeekend: parts.weekday === "Saturday" || parts.weekday === "Sunday",
  };
}

export function dublinTimeToUtc(dateKey, minutesOfDay) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, 0, minutesOfDay);
  let guess = wallAsUtc;

  // Two passes converge across DST boundaries.
  for (let pass = 0; pass < 2; pass++) {
    const shown = dublinParts(new Date(guess));
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute);
    guess += wallAsUtc - shownAsUtc;
  }

  return new Date(guess);
}

function comicBlockedMinutes() {
  const hours = String(process.env.COMIC_PUBLISH_HOURS || "8,13,17,20")
    .split(",")
    .map((hour) => Number(hour.trim()))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);
  hours.push(Number(process.env.COMIC_RECAP_HOUR || 22));

  return hours.map((hour) => hour * 60);
}

export function pickSlotTime(type, dateKey, now = new Date()) {
  const slot = DAILY_POST_SLOTS[type];
  if (!slot) throw new Error(`Unknown daily post type: ${type}`);

  const blocked = comicBlockedMinutes();
  const candidates = [];
  for (let minute = slot.startHour * 60; minute < slot.endHour * 60; minute++) {
    if (blocked.some((comicMinute) => Math.abs(comicMinute - minute) < COMIC_GAP_MINUTES)) continue;
    if (dublinTimeToUtc(dateKey, minute).getTime() < now.getTime() + MIN_LEAD_MS) continue;
    candidates.push(minute);
  }
  if (!candidates.length) return null;

  const minute = candidates[Math.floor(Math.random() * candidates.length)];
  const seconds = Math.floor(Math.random() * 60);
  return new Date(dublinTimeToUtc(dateKey, minute).getTime() + seconds * 1000);
}

export function isWithinPostingGrace(type, dateKey, now = new Date()) {
  const slot = DAILY_POST_SLOTS[type];
  const opensAt = dublinTimeToUtc(dateKey, slot.startHour * 60).getTime();
  const closesAt = dublinTimeToUtc(dateKey, slot.endHour * 60 + STALE_GRACE_MINUTES).getTime();
  return now.getTime() >= opensAt - MIN_LEAD_MS && now.getTime() <= closesAt;
}
