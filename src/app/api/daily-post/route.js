import { randomUUID } from "node:crypto";

import { generateComicImage } from "@/lib/comic/content";
import { assertExpectedXAccount, postComicToX } from "@/lib/comic/twitter";
import {
  DAILY_POST_MAX_CHARS,
  buildDailyPostImagePrompt,
  finalizePostText,
  normalizePostText,
  persistDailyPostImage,
  researchAndWritePost,
} from "@/lib/daily-posts/content";
import { formatMarketSnapshot, getMarketSnapshot } from "@/lib/daily-posts/market";
import { verifyDailyPostRequest } from "@/lib/daily-posts/qstash";
import { DAILY_POST_CHARACTER, DAILY_POST_COSTUMES, selectDailyPostReferences } from "@/lib/daily-posts/references";
import { selectDailyPostScene } from "@/lib/daily-posts/scenes";
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

const DAILY_POST_COMPOSITIONS = [
  "Wide environmental frame from knee height; action on the left third and location filling the background.",
  "High three-quarter view with diagonal movement; her hands and actual task clearly visible.",
  "Medium side-on frame with layered depth and no camera-facing stance; do not invent a doorway.",
  "Wide lateral profile with strong negative space and a clear full-body silhouette in mid-action.",
  "Low three-quarter medium shot with one large foreground object and her task beyond it.",
  "Eye-level candid medium frame; asymmetrical posture and gaze directed at the object she is handling.",
  "Wide frame with foreground elements already present in the assignment, off-center hero and deep environmental context.",
  "Overhead three-quarter frame emphasizing the action's geometry and her active hands, face still visible; no invented tools.",
  "Tight three-quarter upper-body view; expressive face, working hands, and the setting reflected behind her.",
  "Long diagonal composition from the far end of the space with a foreground leading line toward her activity.",
  "Medium three-quarter frame from behind one shoulder, face in profile and the scene's focal action beyond her.",
  "Ground-level wide view with overlapping planes and a dynamic bent-knee or seated silhouette appropriate to the activity.",
];

const DAILY_POST_EXPRESSIONS = [
  "An amused crooked grin, eyes following the task rather than looking at the viewer.",
  "Focused concentration with one eyebrow raised and a slightly pursed mouth.",
  "An open spontaneous laugh and relaxed shoulders caught mid-movement.",
  "A playfully exasperated sideways glance with expressive, asymmetrical hands.",
  "Quiet contentment with a small closed-mouth smile and unposed body language.",
  "Wide-eyed surprise at a harmless complication, caught just before she recovers.",
  "A proud little smirk as a difficult task finally works, weight shifted naturally.",
  "Sleepy determination with a tiny yawn suppressed behind a gloved hand when the task permits.",
  "A warm attentive smile directed toward someone she is helping just outside the frame.",
  "A skeptical raised brow and a comically careful posture toward an uncooperative prop.",
];

const DAILY_POST_FOCUSED_EXPRESSIONS = [
  "Steady focused eyes and a set jaw, gaze fixed on the rescue rather than the camera.",
  "Alert concentration, slightly furrowed brow, composed rather than frightened.",
  "Calm reassuring expression directed toward the person she is protecting.",
  "Quiet determination, lips pressed together and eyes tracking the danger.",
  "Controlled confidence and a level gaze, fully attentive to the people around her.",
  "Resolute expression with raised alert brows, shoulders engaged in the assigned action.",
];

const DAILY_POST_LIGHTING = {
  gm: ["Soft early morning light, naturally adapted to the assigned interior or exterior.", "Clear morning side-light and gentle shadows appropriate to this setting.", "Low golden morning light on the scene's existing surfaces.", "Fresh cool morning tones with warm reflected light.", "Diffuse morning illumination with clear readable faces.", "Bright early daylight and long shadows only where the location permits."],
  gd: ["Clear afternoon daylight, adapted to this interior or exterior.", "Cloud-filtered afternoon light with soft depth.", "Bright daytime illumination with natural reflected colors.", "Warm afternoon side-light across existing surfaces.", "Soft shaded daylight with a brighter background where appropriate.", "Neutral daytime light and clear faces without invented weather or windows."],
  gn: ["Warm location-appropriate practical lights against cool night shadows.", "Soft night illumination with subtle silver edges where outdoors.", "Amber city or interior lighting with quiet blue shadows.", "Existing street or room lights shaping the action without invented fires or lanterns.", "Gentle nighttime contrast, using only light sources that belong in this setting.", "Soft pools of city or room light with dark nocturnal surroundings."],
};

function pickFreshValue(values, previous) {
  const excluded = new Set(previous.filter(Boolean).slice(0, values.length - 1));
  const available = values.filter((value) => !excluded.has(value));
  return available[Math.floor(Math.random() * available.length)];
}

function pickVisualDirection(type, recent, previousDirection, clock = getDublinClock()) {
  const directions = [previousDirection, ...recent.map((post) => post.visualDirection || post.draft?.visualDirection)].filter(Boolean);
  const sameType = directions.filter((direction) => direction.type === type);
  const selected = selectDailyPostScene(type, clock.weekday, directions);
  const costumeId = pickFreshValue(DAILY_POST_COSTUMES.map((costume) => costume.id), directions.map((direction) => direction.costumeId));
  const costume = DAILY_POST_COSTUMES.find((item) => item.id === costumeId);
  const referenceId = pickFreshValue(costume.references.map((reference) => reference.id), directions.map((direction) => direction.referenceId));
  const expressions = ["rescue", "crime"].includes(selected.category) ? DAILY_POST_FOCUSED_EXPRESSIONS : DAILY_POST_EXPRESSIONS;
  return {
    type,
    characterId: DAILY_POST_CHARACTER.id,
    sceneId: selected.id,
    category: selected.category,
    weekday: clock.weekday,
    permittedDays: selected.days,
    activity: selected.activity,
    logistics: selected.logistics,
    wardrobe: selected.wardrobe,
    clothes: selected.clothes || costume.garment,
    costumeId,
    referenceId,
    composition: pickFreshValue(DAILY_POST_COMPOSITIONS, directions.map((direction) => direction.composition)),
    expression: pickFreshValue(expressions, directions.map((direction) => direction.expression)),
    lighting: selected.lighting || pickFreshValue(DAILY_POST_LIGHTING[type], sameType.map((direction) => direction.lighting)),
  };
}

// Editorial brief per slot; this is what Grok is given to write each post in Fart Girl's voice.
const DAILY_POST_BRIEFS = {
  gm: {
    label: "Good morning",
    greeting: "GM",
    greetingPattern: /\b(gm|good morning)\b/i,
    activityTheme: "Use the assigned morning activity and location; superhero routines can happen anywhere, indoors or outdoors.",
    mission: "A hilarious, energetic superhero morning dispatch. Wake the degens up with swagger and humor, poke fun at whatever wild chaos happened while they were asleep, and invite replies with a fun check-in.",
    research: [
      "Wild, funny, or absurd crypto and tech headlines from overnight.",
      "What degenerate madness happened on Crypto Twitter while Europe was sleeping.",
      "Solana ecosystem energy or meme coin chatter.",
    ],
    mustInclude: [
      "Open with an energetic GM in the first line.",
      "Set the scene by mentioning the specifically assigned morning activity, not a default coffee or rooftop scene.",
      "A funny, unbothered superhero or crypto observation/joke.",
      "An engaging question or degen check-in (coffee count, bag status, 3am trading mistakes).",
      "Where it fits, a short feel-good line or healthy quote (positive start to the day, self-care, kindness). Say everything in clear, simple language.",
    ],
    tone: "Simple, clear, upbeat and warm with light humor. Plain everyday words, easy to understand at a glance, no cryptic or riddle-like lines.",
    imageMood: "Morning light appropriate to the assigned location and lighting direction, with restrained emerald accents.",
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
    activityTheme: "Use the assigned daytime activity and location; mix helpful missions, hobbies, training, and lunch-break mishaps.",
    mission: "A midday comedic boost. Check in on how everyone's day is going, drop a witty take on whatever Crypto Twitter is losing its mind over, and break up the afternoon slump with superhero humor.",
    research: [
      "The biggest drama, meme, or hot topic blowing up on Crypto Twitter today.",
      "Relatable midday trader moments (checking charts at work, fake pump alerts, lunch money apeing).",
      "Solana / meme coin community vibe.",
    ],
    mustInclude: [
      "Warm midday greeting in the first line.",
      "Set the scene with the specifically assigned daytime activity rather than an interchangeable city patrol.",
      "A funny, relatable observation about the midday crypto grind.",
      "A cheeky question or prompt for lunch-break traders to reply to.",
      "Where it fits, a short feel-good line or healthy quote (take a break, drink water, be kind to yourself). Say everything in clear, simple language.",
    ],
    tone: "Friendly, clear, playful and encouraging. Plain everyday words, easy to understand at a glance, no cryptic or riddle-like lines.",
    imageMood: "Daylight appropriate to the assigned location and lighting direction; no compulsory streets or skyline.",
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
    activityTheme: "Use the assigned nighttime activity and location; include quiet indoor routines and unusual night missions, not default rooftop poses.",
    mission: "Tuck the degens in with a funny, warm superhero night-cap. Roast everyone who won't close their charts, share a reflection from the assigned activity, and remind the community of the long game with a laugh.",
    research: [
      "How the crypto day wrapped up (chaos, chop, or madness?).",
      "The funniest community moments or memes from today.",
      "Tomorrow's potential madness.",
    ],
    mustInclude: [
      "Say GN clearly in the first or last line.",
      "Set the scene with the specifically assigned nighttime activity and its actual setting.",
      "A hilarious or warm closing thought on today's crypto circus, reminding the community we're in this for the long game.",
      "A cheeky order to close the charts and get some sleep while you take the night shift.",
      "Where it fits, a short feel-good line or healthy quote (rest, gratitude, small wins, tomorrow is a fresh start). Say everything in clear, simple language.",
    ],
    tone: "Cozy, calm, reflective and comforting. Plain everyday words, easy to understand at a glance, no cryptic or riddle-like lines.",
    imageMood: "Nighttime lighting appropriate to the assigned setting; interiors are welcome and city neon is not required.",
    formats: [
      { id: "rooftop-debrief", name: "Evening Debrief", how: "Laughing at today's candle action while doing the assigned evening activity." },
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

async function generateDraft({ type, brief, now, record, previousDirection, previousScene }) {
  const recent = await listRecentDailyPosts(120);
  const clock = getDublinClock(now);
  const visualDirection = pickVisualDirection(type, recent, previousDirection, clock);
  const selectedBrief = { ...brief, activityTheme: visualDirection.activity, imageMood: visualDirection.lighting };
  const format = pickFormat(brief.formats, recent.filter((item) => item.type === type));
  const coinFocus = pickWeighted(COIN_FOCUS);
  const market = await getMarketSnapshot();
  record("market", market.errors.length ? "partial" : "ok", { errors: market.errors });

  record("research", "started", { format: format.id, coinFocus: coinFocus.id });
  const draft = await researchAndWritePost({
    type,
    brief: selectedBrief,
    visualDirection,
    format,
    coinFocus,
    clock,
    marketBlock: formatMarketSnapshot(market),
    recent,
    maxChars: DAILY_POST_MAX_CHARS,
  });
  record("research", "ok", { headline: draft.headline, citations: draft.citations.length });

  const text = await finalizePostText(draft.text, selectedBrief, DAILY_POST_MAX_CHARS);
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
    visualDirection,
    altText: draft.altText || `Fart Girl, the emerald superhero, in today's ${brief.label.toLowerCase()} scene.`,
    imagePrompt: buildDailyPostImagePrompt({ scene: draft.scene, imageMood: visualDirection.lighting, visualDirection, recentScenes: [previousScene, ...recent.slice(0, 12).map((post) => post.scene)] }),
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
  let previousDirection = null;
  let previousScene = null;

  try {
    if (preview) {
      const existing = await getDailyPost(postKey);
      if (["published", "posted_unconfirmed"].includes(existing?.publishStatus)) {
        record("draft", "skipped", { postKey, publishStatus: existing.publishStatus });
        return Response.json({ ok: true, traceId, logs, skipped: true, postKey, publishStatus: existing.publishStatus, tweetId: existing.tweetId || null });
      }
      result = regenerate ? null : existing?.draft || null;
      previousDirection = existing?.draft?.visualDirection;
      previousScene = existing?.draft?.scene;
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
      previousDirection = post.draft?.visualDirection;
      previousScene = post.draft?.scene;
    }

    if (result) {
      if (result.visualDirection?.characterId !== DAILY_POST_CHARACTER.id
        || !result.visualDirection?.permittedDays?.includes(getDublinClock(now).weekday)) {
        record("draft", "creative-refresh-required", { reason: "Legacy character references or scene not permitted today." });
        result = null;
      }
    }

    if (result) {
      result = { ...result };
      result.text = normalizePostText(result.text);
      record("draft", "reused", { generatedAt: result.generatedAt, hasImage: Boolean(result.imageUrl) });
      if (regenerateImage) {
        const recent = await listRecentDailyPosts(120);
        result.visualDirection = pickVisualDirection(type, recent, result.visualDirection, getDublinClock(now));
        result.scene = result.visualDirection.activity;
        result.altText = `Fart Girl: ${result.visualDirection.activity}`;
        result.imagePrompt = buildDailyPostImagePrompt({ scene: result.scene, imageMood: result.visualDirection.lighting, visualDirection: result.visualDirection, recentScenes: recent.slice(0, 12).map((item) => item.scene) });
        delete result.imageUrl;
        record("image", "regenerate-requested");
      }
    } else {
      result = await generateDraft({ type, brief, now, record, previousDirection, previousScene });
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
      image = await generateComicImage(result.imagePrompt, selectDailyPostReferences(result.visualDirection), {
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
