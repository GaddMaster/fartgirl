import { randomUUID } from "node:crypto";

import { generateComicImage } from "@/lib/comic/content";
import { assertExpectedXAccount, postComicToX } from "@/lib/comic/twitter";
import {
  DAILY_POST_MAX_CHARS,
  DAILY_POST_REFERENCES,
  buildDailyPostImagePrompt,
  finalizePostText,
  persistDailyPostImage,
  researchAndWritePost,
} from "@/lib/daily-posts/content";
import { formatMarketSnapshot, getMarketSnapshot } from "@/lib/daily-posts/market";
import { verifyDailyPostRequest } from "@/lib/daily-posts/qstash";
import { getDublinClock, getDublinDate, isWithinPostingGrace } from "@/lib/daily-posts/schedule";
import {
  claimDailyPost,
  getDailyPost,
  listRecentDailyPosts,
  markDailyPostFailed,
  markDailyPostPostedUnconfirmed,
  markDailyPostPublished,
} from "@/lib/daily-posts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Editorial brief per slot; this is what Grok is given to research and write each post.
const DAILY_POST_BRIEFS = {
  gm: {
    label: "Good morning",
    greeting: "GM",
    greetingPattern: /\b(gm|good morning)\b/i,
    researchWindow: "Overnight: since roughly 18:00 Irish time yesterday, covering the US close and the Asia session.",
    mission: "Be the best thing a holder reads with their first coffee. Say good morning, then hand them the sharpest overnight crypto/market intel and one thing to watch today, so they start the day ahead of the timeline.",
    research: [
      "What moved overnight: BTC, ETH, SOL and the total market (use the snapshot numbers), plus the real reason if one is reported (ETF flows, liquidations, macro, a big headline).",
      "What's on today's calendar: macro data releases, Fed/ECB speakers, token unlocks, major launches, deadlines or votes that actually matter today.",
      "Solana ecosystem and memecoin headlines from the last ~12h.",
      "One funky, surprising or delightful real story from crypto, tech, science or space that is fun to wake up to.",
    ],
    mustInclude: [
      "Open with GM (or Good morning) in the first line, ideally with a hook.",
      "At least one concrete, verified fact or number.",
      "One clear 'watch today' item or practical takeaway.",
      "End with a short motivating or cheeky sign-off line.",
    ],
    tone: "Bright, sharp, energising, sunrise optimism with a wink. Never preachy.",
    imageMood: "Golden-hour dawn. Warm peach and gold sunrise light, long shadows, morning mist lit emerald by her glow, city waking up.",
    formats: [
      { id: "morning-briefing", name: "Morning Briefing", how: "Two or three tight overnight facts as short lines, then one thing to watch today." },
      { id: "coffee-and-charts", name: "Coffee & Charts", how: "One market signal (Fear & Greed, BTC dominance, SOL move or volume) explained in plain English, with the 'so what'." },
      { id: "weird-wakeup", name: "Weird News Wake-Up", how: "Lead with the funkiest real story of the night, then link it to a crypto or life lesson." },
      { id: "todays-calendar", name: "Today's Calendar", how: "The one or two scheduled events today that could move markets, explained simply and why they matter." },
      { id: "hero-habit", name: "Hero Habit", how: "Turn a real overnight story (hack, scam, mistake, win) into one practical habit for the day, e.g. revoke approvals, take profits, verify links." },
    ],
  },
  gd: {
    label: "Good day (midday check-in)",
    greeting: "Hope your day's going well",
    greetingPattern: /\b(good day|gd|good afternoon|afternoon|hope your day|how'?s your day|how is your day)\b/i,
    researchWindow: "Today so far: from 00:00 Irish time until now, with focus on the last 6 hours and the US session.",
    mission: "A midday check-in that respects people's time: hope your day is going well, here is what is actually happening right now, and one useful thing that makes you smarter about today.",
    research: [
      "What's moving right now: US session open on weekdays, crypto majors and SOL (snapshot numbers), any sharp move and its reported cause.",
      "What crypto X is genuinely talking about right now (x_search): the dominant narrative, debate or meme, summarised fairly.",
      "Something real that happened on this calendar date in crypto or internet history (verify the date).",
      "A useful explainer angle tied to a live story: liquidity, market cap vs FDV, slippage, rug signals, wallet security, how ETFs/flows work, Solana tooling.",
    ],
    mustInclude: [
      "Open with a warm midday check-in in the first line (e.g. hope your day's going well / how's your day going).",
      "At least one concrete, verified fact or number about today.",
      "One genuinely useful insight, explainer or tip a newer holder would thank you for.",
      "Keep it human: a light joke or relatable line about the middle of the day.",
    ],
    tone: "Friendly, curious, smart-but-simple, a little cheeky. The helpful friend who reads everything so you don't have to.",
    imageMood: "Bright midday daylight, clear blue sky, crisp high sun, bustling streets, saturated colours, her emerald glow popping against daylight.",
    formats: [
      { id: "midday-pulse", name: "Midday Pulse", how: "What's moving right now and the one-line reason, plus how the vibe compares to this morning." },
      { id: "ct-temperature", name: "CT Temperature Check", how: "The main thing crypto X is arguing about today, both sides summarised fairly in a line each, then a calm Fart Girl take." },
      { id: "explain-like-fart-girl", name: "Explain It Like Fart Girl", how: "Name today's story first (what happened + a number), then explain the one concept behind it in two or three short lines a newcomer instantly gets." },
      { id: "this-day-in-crypto", name: "This Day In Crypto", how: "A verified historical event from this calendar date, why it mattered then, and what it teaches now." },
      { id: "myth-vs-fact", name: "Myth vs Fact", how: "Debunk one claim circulating today with a verified fact. Firm, never mean." },
      { id: "solana-spotlight", name: "Solana Spotlight", how: "One real Solana ecosystem development from today, why holders should care, in plain words." },
    ],
  },
  gn: {
    label: "Good night",
    greeting: "GN",
    greetingPattern: /\b(gn|good night|goodnight|nighty night)\b/i,
    researchWindow: "Today in full: 00:00 Irish time until now.",
    mission: "Close the day like a pro: what mattered today, how things finished, the weirdest thing that happened, and what to watch tomorrow. Then tuck the community in. People should feel informed, calm and part of something.",
    research: [
      "The single biggest crypto story of the day and how majors and SOL finished vs 24h ago (snapshot numbers).",
      "The strangest, funniest or most wholesome real story of the day in crypto, tech, science or the internet.",
      "Tomorrow's scheduled catalysts: macro data, unlocks, launches, votes, earnings that touch crypto.",
      "$FARTGIRL / $FARTBOY community or chart notes only if real (snapshot or verified posts).",
    ],
    mustInclude: [
      "Say GN (or good night) clearly; it can open or close the post but must be there.",
      "At least one concrete, verified fact or number from today.",
      "A one-line takeaway or tomorrow watch item.",
      "A cosy, cheeky or reflective closing line about the long game.",
    ],
    tone: "Calm, cosy, reflective, witty, sometimes gritty-late-night. The hero finally sitting down after a long shift.",
    imageMood: "Night. Deep indigo and teal sky, moonlight, city neon, rooftop or skyline, her emerald glow as the brightest light in the frame. Cosy or cinematic.",
    formats: [
      { id: "day-in-review", name: "Day In Review", how: "Three short lines: the biggest story, how markets finished, one surprise. Then GN." },
      { id: "night-shift-weird", name: "Night Shift Weird", how: "Lead with the strangest real story of the day, land a smart takeaway, then GN." },
      { id: "tomorrows-watchlist", name: "Tomorrow's Watchlist", how: "One line on today, then the one or two things to watch tomorrow and why. Then GN." },
      { id: "lesson-of-the-day", name: "Lesson Of The Day", how: "What today's market or news taught us in one honest, memorable line, backed by one fact. Then GN." },
      { id: "moonlight-lore", name: "Moonlight Lore", how: "A two-line future-timeline vignette of Fart Girl reacting to a real story from today, then the real fact, then GN." },
      { id: "night-cap", name: "Holder's Night Cap", how: "Thank the community, one real stat or story that matters for the long game (ATH, $1B dream, Fart Boy family), then GN. Warm, never begging." },
    ],
  },
};

const COIN_FOCUS = [
  { id: "light", weight: 5, how: "Mention $FARTGIRL once, naturally (e.g. in the sign-off). No price talk about it." },
  { id: "stat", weight: 3, how: "Include ONE live $FARTGIRL stat from the snapshot (market cap, 24h move, or distance to ATH / the $1B dream). Honest framing, no hype words." },
  { id: "lore", weight: 2, how: "Weave in the family lore: big brother $FARTBOY, little sister with room to run. Use live numbers only from the snapshot, no predictions." },
];

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[0];
}

function pickFormat(formats, recentSameType) {
  const recentIds = new Set(recentSameType.slice(0, 3).map((post) => post.format));
  const fresh = formats.filter((format) => !recentIds.has(format.id));
  const pool = fresh.length ? fresh : formats;
  return pool[Math.floor(Math.random() * pool.length)];
}

function parseBody(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function handle(request) {
  const startedAt = Date.now();
  const traceId = randomUUID();
  const logs = [];
  const record = (step, status, details = {}) => {
    const entry = { step, status, at: new Date().toISOString(), elapsedMs: Date.now() - startedAt, ...details };
    logs.push(entry);
    console.log("[daily-post]", JSON.stringify({ traceId, ...entry }));
  };

  const auth = await verifyDailyPostRequest(request);
  if (!auth.authorized) {
    record("authorize", "failed");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  record("authorize", "ok", { via: auth.via });

  const url = new URL(request.url);
  const body = parseBody(auth.bodyText);
  const type = String(url.searchParams.get("type") || body.type || "").toLowerCase();
  const brief = DAILY_POST_BRIEFS[type];
  if (!brief) {
    return Response.json({ ok: false, traceId, error: "type must be gm, gd or gn" }, { status: 400 });
  }

  const now = new Date();
  const preview = url.searchParams.get("preview") === "1";
  const previewImage = preview && url.searchParams.get("image") === "1";
  const date = String(body.date || url.searchParams.get("date") || getDublinDate(now));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false, traceId, error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  const postKey = `${date}-${type}`;

  if (!preview && process.env.DAILY_POST_ENABLED !== "1") {
    record("publishing-gate", "disabled");
    return Response.json({ ok: true, traceId, logs, disabled: true, message: "Set DAILY_POST_ENABLED=1 to publish daily posts." });
  }

  // A delayed QStash retry must not post "GM" in the afternoon.
  if (!preview && auth.via === "qstash" && !isWithinPostingGrace(type, date, now)) {
    record("window", "stale", { postKey });
    return Response.json({ ok: true, traceId, logs, skipped: true, reason: `Outside the ${type} posting window.` });
  }

  let post = null;
  let posted = false;
  let result = null;

  try {
    if (!preview) {
      record("x-account", "started");
      await assertExpectedXAccount();
      record("x-account", "ok");

      post = await claimDailyPost({ postKey, type, date, claimId: randomUUID() });
      if (!post) {
        const existing = await getDailyPost(postKey);
        record("claim", "skipped", { postKey, publishStatus: existing?.publishStatus || null });
        return Response.json({ ok: true, traceId, logs, skipped: true, postKey, publishStatus: existing?.publishStatus || null });
      }
      record("claim", "ok", { postKey, attempt: post.publishAttempts });
    }

    const recent = await listRecentDailyPosts(12);
    const format = pickFormat(brief.formats, recent.filter((item) => item.type === type));
    const coinFocus = pickWeighted(COIN_FOCUS);
    const market = await getMarketSnapshot();
    record("market", market.errors.length ? "partial" : "ok", { errors: market.errors });

    record("research", "started", { format: format.id, coinFocus: coinFocus.id });
    const draft = await researchAndWritePost({
      type,
      brief,
      format,
      coinFocus,
      clock: getDublinClock(now),
      marketBlock: formatMarketSnapshot(market),
      recent,
      maxChars: DAILY_POST_MAX_CHARS,
    });
    record("research", "ok", { headline: draft.headline, citations: draft.citations.length });

    const text = await finalizePostText(draft.text, brief, DAILY_POST_MAX_CHARS);
    const altText = draft.altText || `Fart Girl, the emerald superhero, in today's ${brief.label.toLowerCase()} scene.`;
    const imagePrompt = buildDailyPostImagePrompt({ scene: draft.scene, imageMood: brief.imageMood });
    record("text", "ok", { length: text.length });

    result = {
      type,
      date,
      format: format.id,
      coinFocus: coinFocus.id,
      headline: draft.headline,
      topics: draft.topics,
      facts: draft.facts,
      citations: draft.citations,
      text,
      scene: draft.scene,
      altText,
      imagePrompt,
    };

    if (preview && !previewImage) {
      return Response.json({ ok: true, traceId, logs, preview: true, postKey, ...result, market });
    }

    record("image-generation", "started");
    const image = await generateComicImage(imagePrompt, DAILY_POST_REFERENCES, {
      aspectRatio: process.env.DAILY_POST_IMAGE_ASPECT || "1:1",
      model: process.env.DAILY_POST_IMAGE_MODEL || undefined,
    });
    record("image-generation", "ok", { bytes: image.buffer.length });

    const stored = await persistDailyPostImage(preview ? `previews/${traceId}` : postKey, image);
    result.imageUrl = stored.url;
    record("blob-upload", "ok", { url: stored.url });

    if (preview) {
      return Response.json({ ok: true, traceId, logs, preview: true, postKey, ...result, market });
    }

    record("x-publish", "started");
    const tweet = await postComicToX(text, image.buffer, image.contentType, altText);
    posted = true;
    result.tweetId = tweet?.data?.id || null;
    record("x-publish", "ok", { tweetId: result.tweetId });

    await markDailyPostPublished(post, result);
    record("database-mark-published", "ok");

    return Response.json({ ok: true, traceId, logs, postKey, tweetId: result.tweetId, text, imageUrl: result.imageUrl });
  } catch (error) {
    const message = error?.message || String(error);
    record("pipeline", "failed", { postKey, postedToX: posted, error: message });

    if (posted) {
      await markDailyPostPostedUnconfirmed(post, result, error).catch(() => null);
      // Return 200 so QStash does not retry and double-post.
      return Response.json({ ok: true, traceId, logs, postKey, tweetId: result?.tweetId, warning: message });
    }
    if (post) await markDailyPostFailed(post, error).catch(() => null);

    return Response.json({ ok: false, traceId, logs, postKey, error: message }, { status: 500 });
  }
}

export async function POST(request) {
  return handle(request);
}
