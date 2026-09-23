import { randomUUID } from "node:crypto";

import {
  claimNextDailyRecap,
  markDailyRecapFailed,
  markDailyRecapPublished,
} from "@/lib/comic/pages";
import { generateDailyRecap } from "@/lib/comic/content";
import { assertExpectedXAccount, postComicGalleryToX } from "@/lib/comic/twitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request) {
  const authorization = request.headers.get("authorization");
  return Boolean(
    (process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`)
    || (process.env.SECRET && authorization === `Bearer ${process.env.SECRET}`),
  );
}

async function downloadPageImage(page) {
  const response = await fetch(page.generatedImageUrl);
  if (!response.ok) throw new Error(`Could not download ${page.pageId} image (${response.status})`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "image/jpeg",
    altText: page.altText,
  };
}

async function handle(request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.COMIC_PUBLISH_ENABLED !== "1") {
    return Response.json({ ok: true, disabled: true, message: "Comic publishing is disabled." });
  }

  const traceId = randomUUID();
  try {
    await assertExpectedXAccount();
    const claimed = await claimNextDailyRecap(randomUUID());
    if (!claimed) {
      return Response.json({ ok: true, traceId, skipped: true, reason: "No complete four-page day is ready for recap." });
    }

    try {
      const text = await generateDailyRecap(claimed.pages);
      const images = await Promise.all(claimed.pages.map(downloadPageImage));
      const tweet = await postComicGalleryToX(text, images);
      await markDailyRecapPublished(claimed.recap, { tweetId: tweet?.data?.id || null, text });
      return Response.json({
        ok: true,
        traceId,
        pageIds: claimed.recap.pageIds,
        pageOrders: claimed.recap.pageOrders,
        tweetId: tweet?.data?.id || null,
      });
    } catch (error) {
      await markDailyRecapFailed(claimed.recap, error).catch(() => null);
      throw error;
    }
  } catch (error) {
    console.error("[comic-daily-recap] failed", { traceId, error: error?.message || String(error) });
    return Response.json({ ok: false, traceId, error: error?.message || "Daily recap failed" }, { status: 500 });
  }
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}