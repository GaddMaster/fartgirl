const IRELAND_TIME_ZONE = "Europe/Dublin";
const PUBLISH_HOURS = new Set([8, 13, 17, 20]);

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

  if (minute !== 0) return null;
  if (PUBLISH_HOURS.has(hour)) return "publish";
  if (hour === 22) return "recap";
  return null;
}

export { IRELAND_TIME_ZONE };