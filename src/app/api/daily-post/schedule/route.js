import { getPublicBaseUrl, getQStashClient } from "@/lib/daily-posts/qstash";
import { DAILY_POST_TYPES, getDublinDate, pickSlotTime } from "@/lib/daily-posts/schedule";
import {
  markDailyPostScheduleFailed,
  markDailyPostScheduled,
  reserveDailyPostSchedule,
} from "@/lib/daily-posts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request) {
  const authorization = request.headers.get("authorization");
  const validCron = process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`;
  const validSecret = process.env.SECRET && authorization === `Bearer ${process.env.SECRET}`;
  return Boolean(validCron || validSecret);
}

export async function GET(request) {
  // Vercel fires crons on preview deployments too.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return Response.json({ ok: true, skipped: true, reason: "non-production environment" });
  }
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  if (!dryRun && process.env.DAILY_POST_ENABLED !== "1") {
    return Response.json({ ok: true, disabled: true, message: "Set DAILY_POST_ENABLED=1 to schedule daily posts." });
  }

  const now = new Date();
  const date = getDublinDate(now);
  const requested = (url.searchParams.get("types") || DAILY_POST_TYPES.join(","))
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter((type) => DAILY_POST_TYPES.includes(type));
  const qstash = dryRun ? null : getQStashClient();
  const scheduled = [];

  for (const type of requested) {
    const postKey = `${date}-${type}`;
    const at = pickSlotTime(type, date, now);
    if (!at) {
      scheduled.push({ type, postKey, skipped: true, reason: "window already passed" });
      continue;
    }

    const entry = {
      type,
      postKey,
      triggerAtUtc: at.toISOString(),
      triggerAtDublin: at.toLocaleString("en-IE", { timeZone: "Europe/Dublin" }),
    };
    if (dryRun) {
      scheduled.push({ ...entry, dryRun: true });
      continue;
    }

    if (!(await reserveDailyPostSchedule({ postKey, type, date, scheduledFor: at }))) {
      scheduled.push({ ...entry, skipped: true, reason: "already scheduled" });
      continue;
    }

    try {
      const { messageId } = await qstash.publishJSON({
        url: `${getPublicBaseUrl()}/api/daily-post?type=${type}`,
        body: { type, date, postKey },
        notBefore: Math.floor(at.getTime() / 1000),
        // No ':' — Upstash rejects deduplication IDs containing colons.
        deduplicationId: `fartgirl-daily-${postKey}`,
        retries: 2,
      });
      await markDailyPostScheduled(postKey, { messageId, scheduledFor: at });
      scheduled.push({ ...entry, messageId });
    } catch (error) {
      await markDailyPostScheduleFailed(postKey, error).catch(() => null);
      scheduled.push({ ...entry, error: error?.message || String(error) });
    }
  }

  console.log("[daily-post-schedule]", JSON.stringify({ date, scheduled }));
  return Response.json({ ok: !scheduled.some((item) => item.error), date, scheduled });
}
