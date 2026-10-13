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
  attachDraftToClaim,
  claimDailyPost,
  getDailyPost,
  listRecentDailyPosts,
  markDailyPostFailed,
  markDailyPostPostedUnconfirmed,
  markDailyPostPublished,
  saveDailyPostDraft,
} from "@/lib/daily-posts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Editorial brief per slot; this is what Grok is given to write each post in Fart Girl's voice.
const DAILY_POST_BRIEFS = {
  gm: {
    label: "Good morning",
    greeting: "GM",
    greetingPattern: /\b(gm|good morning)\b/i,
    activityTheme: "Morning superhero routine: groggily waking up, brewing espresso or iced coffee with a spark of emerald plasma, stretching alongside city pigeons on a skyscraper roof, brushing teeth with her mask half-on, or squinting at wild overnight crypto charts in bed with one eye open while yawning.",
    mission: "A hilarious, energetic superhero morning dispatch. Wake the degens up with swagger and humor, poke fun at whatever wild chaos happened while they were asleep, and invite replies with a fun check-in.",
    research: [
      "Wild, funny, or absurd crypto and tech headlines from overnight.",
      "What degenerate madness happened on Crypto Twitter while Europe was sleeping.",
      "Solana ecosystem energy or meme coin chatter.",
    ],
    mustInclude: [
      "Open with an energetic GM in the first line.",
      "Set the scene by mentioning what morning superhero activity you're currently in the middle of (e.g. brewing espresso with a green spark, stretching on a roof, dodging sunrise traffic).",
      "A funny, unbothered superhero or crypto observation/joke.",
      "An engaging question or degen check-in (coffee count, bag status, 3am trading mistakes).",
    ],
    tone: "Punchy, funny, bold, superhero swagger with broke-barista heart. Zero corporate speak.",
    imageMood: "Golden-hour dawn. Warm peach and gold sunrise light, long shadows, emerald glow, city waking up.",
    formats: [
      { id: "hero-routine", name: "Hero Morning Shift", how: "Fart Girl reacting to overnight chart chaos before her first coffee, dodging red candles." },
      { id: "degen-checkin", name: "Degen Wake-Up Call", how: "Playfully roasting whoever stayed up trading until 4am, asking how their bags survived." },
      { id: "green-gas-charts", name: "Green Gas Energy", how: "Witty superhero take on blasting away market gloom and turning the day green." },
      { id: "weird-news", name: "Overnight Absurdity", how: "Taking the weirdest real crypto/tech headline from overnight and making it a comedy sketch." },
      { id: "sibling-banter", name: "Family Breakfast", how: "Playful ribbing of big brother Fart Boy or sibling meme coin rivalries." },
    ],
  },
  gd: {
    label: "Good day (midday check-in)",
    greeting: "Hope your day's going well",
    greetingPattern: /\b(good day|gd|good afternoon|afternoon|hope your day|how'?s your day|how is your day)\b/i,
    activityTheme: "Daytime patrol & lunch break: sitting on a fire escape eating street tacos or a slice of pizza, sneaking a glance at Solana charts between saving civilians, dodging mid-day city traffic with an emerald boost, having an argument with an over-leveraged villain over lunch, or laughing off mid-afternoon chart chop.",
    mission: "A midday comedic boost. Check in on how everyone's day is going, drop a witty take on whatever Crypto Twitter is losing its mind over, and break up the afternoon slump with superhero humor.",
    research: [
      "The biggest drama, meme, or hot topic blowing up on Crypto Twitter today.",
      "Relatable midday trader moments (checking charts at work, fake pump alerts, lunch money apeing).",
      "Solana / meme coin community vibe.",
    ],
    mustInclude: [
      "Warm midday greeting in the first line.",
      "Set the scene with your daytime patrol or lunch break activity (e.g. eating tacos on a ledge, watching charts between saving citizens).",
      "A funny, relatable observation about the midday crypto grind.",
      "A cheeky question or prompt for lunch-break traders to reply to.",
    ],
    tone: "Playful, witty, charming, cheeky. The superhero friend dropping by during your lunch break.",
    imageMood: "Bright midday daylight, clear blue sky, bustling city streets, crisp high sun, her emerald glow popping against daylight.",
    formats: [
      { id: "lunch-break", name: "Midday Patrol", how: "Lena on a lunch break checking the charts and wondering if villains ever take naps." },
      { id: "timeline-drama", name: "CT Drama Check", how: "Hilariously summarizing the dumbest thing Crypto Twitter is fighting over today." },
      { id: "superhero-confession", name: "Hero Confession", how: "Admitting a relatable crypto or superhero fail (e.g. staring at 1m candles during a villain fight)." },
      { id: "community-debate", name: "Midday Debate", how: "Posing a funny crypto dilemma for the replies." },
      { id: "vibe-check", name: "Holder Vibe Check", how: "Checking in on the fam, celebrating green days or laughing through sideways chop." },
    ],
  },
  gn: {
    label: "Good night",
    greeting: "GN",
    greetingPattern: /\b(gn|good night|goodnight|nighty night)\b/i,
    activityTheme: "Night watch & rooftop wind-down: perched on a high gargoyle or rooftop edge under the moonlight and neon skyline, kicking combat boots over the drop, sipping chamomile tea or hot cocoa with emerald steam, recharging suit glow, staring at the moon and dreaming of $1B, or telling degens to close charts and go to sleep.",
    mission: "Tuck the degens in with a funny, warm superhero night-cap. Roast everyone who won't close their charts, share a rooftop reflection, and remind the community of the long game with a laugh.",
    research: [
      "How the crypto day wrapped up (chaos, chop, or madness?).",
      "The funniest community moments or memes from today.",
      "Tomorrow's potential madness.",
    ],
    mustInclude: [
      "Say GN clearly in the first or last line.",
      "Set the scene with your rooftop night watch or cozy late-night wind-down activity.",
      "A hilarious or warm closing thought on today's crypto circus, reminding the community we're in this for the long game.",
      "A cheeky order to close the charts and get some sleep while you take the night shift.",
    ],
    tone: "Cozy, witty, reflective, superhero sitting on a rooftop under the stars. Warm family vibe.",
    imageMood: "Night. Deep indigo and teal sky, moonlight, city neon, rooftop or skyline, her emerald glow as the brightest light in the frame. Cosy or cinematic.",
    formats: [
      { id: "rooftop-debrief", name: "Rooftop Debrief", how: "Sitting with tea on a skyscraper edge, laughing at today's candle action." },
      { id: "sleep-police", name: "Degen Bedtime", how: "Roasting the holders still watching the 1-minute chart at midnight." },
      { id: "night-watch", name: "Night Watch", how: "Fart Girl taking the night shift so the community can rest their eyes." },
      { id: "long-game", name: "Big Picture Laugh", how: "Reminding the community why we hold ($1B dream, little sister energy), laughing through the swings." },
      { id: "night-thoughts", name: "Late Night Dilemma", how: "A funny philosophical question about crypto before sleep." },
    ],
  },
};

const COIN_FOCUS = [
  { id: "community", weight: 5, how: "Mention the $FARTGIRL community/fam with warmth, swagger or a cheeky joke. Natural, never forced ticker spam." },
  { id: "sibling-lore", weight: 3, how: "Drop a fun reference to big bro $FARTBOY (and our run to $1B / $1). Sibling pride and comic superhero lore." },
  { id: "green-glow", weight: 3, how: "Use the green gas / emerald glow as a metaphor for surviving red days and shining bright." },
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

async function generateDraft({ type, brief, now, record }) {
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
  record("text", "ok", { length: text.length });

  return {
    generatedAt: new Date().toISOString(),
    format: format.id,
    coinFocus: coinFocus.id,
    headline: draft.headline,
    topics: draft.topics,
    facts: draft.facts,
    citations: draft.citations,
    text,
    scene: draft.scene,
    altText: draft.altText || `Fart Girl, the emerald superhero, in today's ${brief.label.toLowerCase()} scene.`,
    imagePrompt: buildDailyPostImagePrompt({ scene: draft.scene, imageMood: brief.imageMood }),
    market,
  };
}

async function downloadImage(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Saved draft image download failed (${response.status})`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "image/jpeg",
  };
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
  const regenerate = url.searchParams.get("regenerate") === "1";
  const regenerateImage = url.searchParams.get("regenerateImage") === "1";
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
    if (preview) {
      const existing = await getDailyPost(postKey);
      if (["published", "posted_unconfirmed"].includes(existing?.publishStatus)) {
        record("draft", "skipped", { postKey, publishStatus: existing.publishStatus });
        return Response.json({ ok: true, traceId, logs, skipped: true, postKey, publishStatus: existing.publishStatus, tweetId: existing.tweetId || null });
      }
      result = regenerate ? null : existing?.draft || null;
    } else {
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
      result = regenerate ? null : post.draft || null;
    }

    if (result) {
      result = { ...result };
      record("draft", "reused", { generatedAt: result.generatedAt, hasImage: Boolean(result.imageUrl) });
      if (regenerateImage) {
        // Rebuild from the saved scene so image-prompt changes apply.
        result.imagePrompt = buildDailyPostImagePrompt({ scene: result.scene, imageMood: brief.imageMood });
        delete result.imageUrl;
        record("image", "regenerate-requested");
      }
    } else {
      result = await generateDraft({ type, brief, now, record });
    }

    if (preview && !previewImage) {
      await saveDailyPostDraft({ postKey, type, date, draft: result });
      record("draft", "saved");
      return Response.json({ ok: true, traceId, logs, preview: true, postKey, ...result });
    }

    let image;
    if (result.imageUrl) {
      image = await downloadImage(result.imageUrl);
      record("image", "reused", { url: result.imageUrl });
    } else {
      record("image-generation", "started");
      image = await generateComicImage(result.imagePrompt, DAILY_POST_REFERENCES, {
        aspectRatio: process.env.DAILY_POST_IMAGE_ASPECT || "1:1",
        model: process.env.DAILY_POST_IMAGE_MODEL || undefined,
      });
      record("image-generation", "ok", { bytes: image.buffer.length });

      // Unique name per generation so a regenerated image is never served from CDN cache.
      const stored = await persistDailyPostImage(`drafts/${postKey}-${traceId}`, image);
      result.imageUrl = stored.url;
      record("blob-upload", "ok", { url: stored.url });
    }

    if (preview) {
      await saveDailyPostDraft({ postKey, type, date, draft: result });
      record("draft", "saved");
      return Response.json({ ok: true, traceId, logs, preview: true, postKey, ...result });
    }

    // Lets a QStash retry reuse this content instead of paying Grok again.
    await attachDraftToClaim(post, result);

    record("x-publish", "started");
    const tweet = await postComicToX(result.text, image.buffer, image.contentType, result.altText);
    posted = true;
    result.tweetId = tweet?.data?.id || null;
    record("x-publish", "ok", { tweetId: result.tweetId });

    await markDailyPostPublished(post, result);
    record("database-mark-published", "ok");

    return Response.json({ ok: true, traceId, logs, postKey, tweetId: result.tweetId, text: result.text, imageUrl: result.imageUrl });
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
