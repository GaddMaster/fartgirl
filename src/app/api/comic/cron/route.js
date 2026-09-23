import { GET as publishComic } from "@/app/api/comic/route";
import { GET as publishDailyRecap } from "@/app/api/comic/daily-recap/route";
import { getIrelandComicSchedule } from "@/lib/comic/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request) {
  const authorization = request.headers.get("authorization");
  return Boolean(process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const action = getIrelandComicSchedule();
  if (!action) {
    return Response.json({ ok: true, skipped: true, reason: "Not a configured Ireland comic slot." });
  }

  return action === "publish"
    ? publishComic(request)
    : publishDailyRecap(request);
}