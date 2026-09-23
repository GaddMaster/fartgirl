const IRELAND_TIME_ZONE = "Europe/Dublin";

function parseHours(value, fallback) {
  return new Set(String(value || fallback)
    .split(",")
    .map((hour) => Number(hour.trim()))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23));
}

export function getIrelandComicSchedule(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IE", {
    timeZone: IRELAND_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour);
  const minute = Number(values.minute);

  const publishHours = parseHours(process.env.COMIC_PUBLISH_HOURS, "8,13,17,20");
  const recapHour = Number(process.env.COMIC_RECAP_HOUR || 22);

  if (minute !== 0) return null;
  if (publishHours.has(hour)) return "publish";
  if (hour === recapHour) return "recap";
  return null;
}

export { IRELAND_TIME_ZONE };