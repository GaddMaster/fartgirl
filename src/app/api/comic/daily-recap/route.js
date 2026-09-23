import { randomUUID } from "node:crypto";

import {
  claimNextDailyRecap,
  markDailyRecapFailed,
  markDailyRecapPublished,
  markDailyRecapPostedUnconfirmed,
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
  const startedAt = Date.now();
  const traceId = randomUUID();
  const logs = [];
  const record = (step, status, details = {}) => {
    const entry = {
      step,
      status,
      at: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      ...details,
    };
    logs.push(entry);
    console.log("[comic-daily-recap]", JSON.stringify({ traceId, ...entry }));
  };

  if (!isAuthorized(request)) {
    record("authorize", "failed");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  record("authorize", "ok");
  if (process.env.COMIC_PUBLISH_ENABLED !== "1") {
    record("publishing-gate", "disabled");
    return Response.json({ ok: true, traceId, logs, disabled: true, message: "Comic publishing is disabled." });
  }

  try {
    record("x-account", "started");
    await assertExpectedXAccount();
    record("x-account", "ok");
    record("recap-claim", "started");
    const claimed = await claimNextDailyRecap(randomUUID());
    if (!claimed) {
      record("recap-claim", "empty");
      return Response.json({ ok: true, traceId, logs, skipped: true, reason: "No unrecapped four-page bundle is ready." });
    }
    record("recap-claim", "ok", {
      recapKey: claimed.recap.recapKey,
      pageIds: claimed.recap.pageIds,
      pageOrders: claimed.recap.pageOrders,
    });

    let postedToX = false;
    let tweet = null;
    let text = null;
    try {
      record("grok-summary", "started");
      text = await generateDailyRecap(claimed.pages);
      record("grok-summary", "ok", { textLength: text.length });
      record("image-download", "started", { count: claimed.pages.length });
      const images = await Promise.all(claimed.pages.map(downloadPageImage));
      record("image-download", "ok", {
        count: images.length,
        bytes: images.reduce((total, image) => total + image.buffer.length, 0),
      });
      record("x-publish", "started", { imageCount: images.length });
      tweet = await postComicGalleryToX(text, images);
      postedToX = true;
      record("x-publish", "ok", { tweetId: tweet?.data?.id || null });
      record("database-mark-published", "started");
      try {
        await markDailyRecapPublished(claimed.recap, { tweetId: tweet?.data?.id || null, text });
        record("database-mark-published", "ok");
      } catch (error) {
        await markDailyRecapPostedUnconfirmed(claimed.recap, { tweetId: tweet?.data?.id || null, text }, error).catch(() => null);
        record("database-mark-published", "posted_unconfirmed", { error: error?.message || String(error) });
        throw error;
      }
      return Response.json({
        ok: true,
        traceId,
        logs,
        pageIds: claimed.recap.pageIds,
        pageOrders: claimed.recap.pageOrders,
        tweetId: tweet?.data?.id || null,
      });
    } catch (error) {
      record("pipeline", "failed", {
        recapKey: claimed.recap.recapKey,
        postedToX,
        error: error?.message || String(error),
      });
      if (!postedToX) {
        await markDailyRecapFailed(claimed.recap, error).catch(() => null);
        record("database-mark-failed", "ok");
      } else {
        record("database-mark-failed", "skipped", { reason: "X post succeeded; recap is locked as posted_unconfirmed." });
      }
      throw error;
    }
  } catch (error) {
    console.error("[comic-daily-recap] failed", JSON.stringify({ traceId, error: error?.message || String(error), elapsedMs: Date.now() - startedAt }));
    return Response.json({ ok: false, traceId, logs, error: error?.message || "Daily recap failed" }, { status: 500 });
  }
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}