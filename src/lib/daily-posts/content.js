import { put } from "@vercel/blob";

import comicManifest from "@/app/assets/comic_manifest";
import { FARTBOY_CA, FARTGIRL_CA } from "@/lib/daily-posts/market";

const XAI_BASE_URL = "https://api.x.ai/v1";

export const DAILY_POST_MAX_CHARS = Number(process.env.DAILY_POST_MAX_CHARS || 280);

function textModel() {
  return process.env.DAILY_POST_TEXT_MODEL || process.env.COMIC_RECAP_MODEL || "grok-4.3";
}

const REFERENCE_USES = {
  fartgirl_hero: "SUIT LOCK — match this exact suit design, colours, mask, gloves and boots. The only addition is the FART GIRL chest emblem.",
  lena_face: "FACE LOCK — this is her face. Match face shape, brows, brown eyes, left-eyebrow scar, messy low bun.",
};

export const DAILY_POST_REFERENCES = (comicManifest.items || [])
  .filter((item) => REFERENCE_USES[item.id] && item.url)
  .map(({ id, file, url }) => ({ id, file, url, use: REFERENCE_USES[id] }));

const SYSTEM_PROMPT = `You are Fart Girl herself (@FARTGIRL1D) — Lena Cole in the future timeline where she's the world's most popular superhero, blessed with luminous emerald gas powers, living right alongside the crypto degen community.

You speak in FIRST PERSON ("I", "me", "my"). You are witty, funny, bold, self-aware, heroic, and genuinely connected to the community. You are NOT a financial news bot. You are NOT an economic analyst. Nobody follows a superhero called Fart Girl to read housing stats or dry liquidation percentages.

CANON (facts you can weave in naturally)
- You are Fart Girl, Solana superhero.
- Little sister coin to $FARTBOY (Solana). Fart Boy hit $200M peak; you reached ~$20M peak on Feb 10 2025. The community goal is the $1B market cap / $1 mark. Sibling rivalry is always funny and warm.
- Coins Kid is a legendary friend and supporter of the family — never tag him, quote him, or make promises for him, but give a nod to the family if relevant.
- You have an official comic running (PROJECT CHLORIS) about your origin as a broke barista in Kettle City. But in THESE daily posts, you're in the future: superhero celebrity, saving cities, hanging with crypto degens, and navigating the wild world of Web3.

VOICE & PERSONALITY (CRITICAL)
- First person: speak directly to your community as Fart Girl. Witty, charismatic, charming, a little unhinged, deeply relatable. Think Deadpool's banter meets Peter Parker's broke-relatability.
- HUMOR & PERSONALITY FIRST: Posts should make people smile, laugh, feel part of a community, and want to reply.
- CRYPTO IS THE BACKDROP, NOT A LECTURE: If you mention Bitcoin, Solana, market trends, or breaking news, it's the SETUP or PUNCHLINE to a superhero joke (e.g. dodging red candles with green gas, stopping a villain who was distracted checking their 1-minute chart, saving a degen from 3am FOMO).
- NEVER sound like a financial news reporter, Bloomberg terminal, or automated alert bot. No dry economic data, no unsolicited financial statistics.
- ENGAGEMENT: Close with a fun question, a cheeky dare, a relatable check-in, or something that makes people actually want to drop a reply.
- Zero corporate tone. Zero cringe.
- One green-gas / emerald-glow pun or heroic reference is great. Never toilet humor, never crude bodily grossness.
- Never mention AI, prompts, models, or that you are an AI.

ACCOUNT SAFETY (protect the account)
- No links. No @mentions. No contract address. Max 2 hashtags (e.g. #FartGirl #Solana). Max 2 cashtags (e.g. $FARTGIRL).
- No financial advice, no "guaranteed", "100x", "airdrop", "giveaway", "DM me".
- No political arguments, no dunking on victims of hacks or disasters.

LAYOUT & FORMAT
- Split the post into 3-4 short punchy segments with ONE EMPTY LINE between every segment.
- First line is the hook with the greeting (e.g. "GM ☀️", "Hope your day's going well ☕", "GN 🌙").
- Use 3-6 fun, fitting emojis (⚡, 💚, ☕, ☀️, 🌙, 📈, 💥, 🧠, 🦸‍♀️).
- Length: Keep it punchy and easily readable.

IMAGE SCENE
- Describe ONE single cinematic illustration (not a comic page, no panels) in 60-110 words: what Fart Girl is doing in this superhero moment, where, and how it visually captures the vibe.
- She is heroic, stunning, adult woman, confident, chest emblem "FART GIRL" clearly built into the suit, luminous emerald gas energy swirling from her hands or aura.
- Fun, heroic, cinematic situations (e.g. perched on a skyscraper sipping coffee, laughing at a flying holographic chart, soaring above a sunny street, sitting on a rooftop under the moon).

OUTPUT: JSON only, no markdown fences, exactly this shape:
{
  "headline": "3-8 word internal label",
  "topics": ["2-4 topic tags"],
  "facts": [{"claim": "any background fact or news referenced", "source": "where you saw it"}],
  "text": "the finished X post written in first-person Fart Girl voice",
  "scene": "the image scene description",
  "altText": "accessible image description, max 400 characters"
}`;

function formatRecentPosts(recent) {
  if (!recent.length) return "None yet.";
  return recent.map((post) => [
    `- [${post.date} ${post.type}] format="${post.format || "?"}" headline="${post.headline || "?"}" topics=${JSON.stringify(post.topics || [])}`,
    `  scene: ${String(post.scene || "").slice(0, 160)}`,
    `  text: ${String(post.text || "").replace(/\s+/g, " ").slice(0, 200)}`,
  ].join("\n")).join("\n");
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function buildUserPrompt({ type, brief, format, coinFocus, clock, marketBlock, recent, maxChars }) {
  return [
    `POST TYPE: ${type} — ${brief.label}`,
    `NOW: ${clock.weekday} ${clock.date}, ${clock.time} Irish time (Europe/Dublin).${clock.isWeekend ? " It is the weekend: stock markets are closed, crypto never sleeps." : ""}`,
    "",
    `MISSION: ${brief.mission}`,
    `REQUIRED GREETING: ${brief.greeting}`,
    `RESEARCH WINDOW: ${brief.researchWindow}`,
    "RESEARCH FOCUS:",
    ...brief.research.map((item) => `- ${item}`),
    "",
    `TODAY'S FORMAT: "${format.name}" — ${format.how}`,
    `COIN TOUCH: ${coinFocus.how}`,
    "",
    "MUST:",
    ...brief.mustInclude.map((item) => `- ${item}`),
    `TONE: ${brief.tone}`,
    `IMAGE MOOD: ${brief.imageMood}`,
    "",
    "MARKET CONTEXT (optional flavor/punchline material only — never output dry financial reports, liquidation numbers, or economic data):",
    marketBlock,
    "",
    "RECENT POSTS (do not repeat their jokes, topics, or scenes):",
    formatRecentPosts(recent),
    "",
    `LENGTH: the "text" field must be at most ${maxChars} characters (emojis count as 2). Aim for ${maxChars - 50}-${maxChars - 20} to leave a safety margin. Spend characters on personality, humor, and community banter, not on dry data.`,
    "Write with Fart Girl's true superhero voice and swagger. Return JSON only.",
  ].join("\n");
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const chunks = [];
  for (const item of payload?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (typeof part?.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

function extractCitations(payload) {
  const urls = new Set(Array.isArray(payload?.citations) ? payload.citations.map(String) : []);
  for (const item of payload?.output ?? []) {
    for (const part of item?.content ?? []) {
      for (const annotation of part?.annotations ?? []) {
        if (annotation?.url) urls.add(annotation.url);
      }
    }
  }
  return [...urls].slice(0, 20);
}

function parseJson(raw) {
  const text = String(raw || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function researchAndWritePost(options) {
  if (!process.env.XAI_API_KEY) throw new Error("Missing XAI_API_KEY");

  const now = new Date();
  const response = await fetch(`${XAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: textModel(),
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(options) },
      ],
      tools: [
        { type: "web_search" },
        {
          type: "x_search",
          from_date: isoDay(new Date(now.getTime() - 2 * 86_400_000)),
          to_date: isoDay(new Date(now.getTime() + 86_400_000)),
          enable_image_understanding: false,
        },
      ],
      max_turns: Number(process.env.DAILY_POST_MAX_TURNS || 8),
    }),
    signal: AbortSignal.timeout(170_000),
  });

  if (!response.ok) {
    throw new Error(`xAI research failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }

  const payload = await response.json();
  const parsed = parseJson(extractResponseText(payload));
  if (!parsed?.text || !parsed?.scene) {
    throw new Error("xAI research returned no usable post JSON");
  }

  return {
    headline: String(parsed.headline || "").slice(0, 120),
    topics: (Array.isArray(parsed.topics) ? parsed.topics : []).map(String).slice(0, 4),
    facts: (Array.isArray(parsed.facts) ? parsed.facts : []).slice(0, 8).map((fact) => ({
      claim: String(fact?.claim || "").slice(0, 300),
      source: String(fact?.source || "").slice(0, 300),
    })),
    text: String(parsed.text).trim(),
    scene: String(parsed.scene).trim().slice(0, 1200),
    altText: String(parsed.altText || "").trim().slice(0, 1000),
    citations: extractCitations(payload),
    usage: payload?.usage || null,
  };
}

// X weights most non-Latin characters (emoji, CJK) as 2.
export function xWeightedLength(text) {
  let length = 0;
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    const light = code <= 0x10ff
      || (code >= 0x2000 && code <= 0x200d)
      || (code >= 0x2010 && code <= 0x201f)
      || (code >= 0x2032 && code <= 0x2037);
    length += light ? 1 : 2;
  }
  return length;
}

const HARD_BANNED = /\b(guarantee[ds]?|risk[- ]free|can'?t lose|\d{3,}x|airdrop|giveaway|dm (me|us)|send (sol|eth|btc)|poop|toilet|diarrh\w*|anus|as an ai)\b/i;

export function validatePostText(text, brief, maxChars) {
  const issues = [];
  if (!text) issues.push("Post is empty.");
  if (xWeightedLength(text) > maxChars) issues.push(`Too long: ${xWeightedLength(text)} weighted chars, max ${maxChars}.`);
  if (!brief.greetingPattern.test(text)) issues.push(`Missing the required greeting (${brief.greeting}).`);
  if (/https?:\/\/|www\./i.test(text)) issues.push("Contains a link; remove it.");
  if (/(^|[\s(])@\w/.test(text)) issues.push("Contains an @mention; remove it.");
  if ((text.match(/#\w+/g) || []).length > 2) issues.push("More than 2 hashtags.");
  if ((text.match(/\$[A-Za-z]{2,}/g) || []).length > 2) issues.push("More than 2 cashtags.");
  if (text.includes(FARTGIRL_CA) || text.includes(FARTBOY_CA)) issues.push("Contains a contract address; remove it.");
  const banned = text.match(HARD_BANNED);
  if (banned) issues.push(`Contains banned wording: "${banned[0]}".`);
  return issues;
}

function styleIssues(text) {
  const issues = [];
  const segments = text.split(/\n\s*\n/).filter((segment) => segment.trim());
  if (segments.length < 3) {
    issues.push("Split the post into 3-5 short segments with one empty line between every segment.");
  }
  if ((text.match(/\p{Extended_Pictographic}/gu) || []).length < 3) {
    issues.push("Use 3-6 fitting emojis at the start or end of segments.");
  }
  return issues;
}

async function rewritePost({ text, issues, brief, maxChars }) {
  // Models undercount characters, so aim below the hard limit.
  const targetChars = Math.max(120, maxChars - 30);
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: textModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You fix X posts for the Fart Girl account. Keep the news story, its key fact/number and the voice; only fix the listed issues. The post must open with the greeting "${brief.greeting}", be at most ${targetChars} characters (emojis count as 2; shorten by cutting filler lines, never the story), have no links, no @mentions, no contract addresses, at most 2 hashtags. Layout: 3-5 short segments separated by one empty line each, with 3-6 fitting emojis at the start or end of segments. Return JSON only: {"text": "..."}`,
        },
        { role: "user", content: `ISSUES:\n- ${issues.join("\n- ")}\n\nCURRENT LENGTH: ${xWeightedLength(text)} weighted chars. TARGET: ${targetChars} or fewer.\n\nPOST:\n${text}` },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    throw new Error(`xAI rewrite failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  }
  const payload = await response.json();
  return String(parseJson(payload?.choices?.[0]?.message?.content)?.text || "").trim();
}

function trimToLength(text, maxChars) {
  if (xWeightedLength(text) <= maxChars) return text;
  const lines = text.split("\n");
  while (lines.length > 1 && xWeightedLength(lines.join("\n")) > maxChars) lines.pop();
  const joined = lines.join("\n").trim();
  if (xWeightedLength(joined) <= maxChars) return joined;

  const ellipsis = "…";
  const chars = Array.from(joined);
  while (chars.length && xWeightedLength(chars.join("").trimEnd()) + xWeightedLength(ellipsis) > maxChars) chars.pop();
  return `${chars.join("").trimEnd()}${ellipsis}`;
}

export async function finalizePostText(draft, brief, maxChars = DAILY_POST_MAX_CHARS) {
  let text = draft.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  let issues = validatePostText(text, brief, maxChars);

  for (let attempt = 0; attempt < 2 && issues.length; attempt++) {
    text = await rewritePost({ text, issues, brief, maxChars });
    issues = validatePostText(text, brief, maxChars);
  }

  // Layout/emoji problems are worth one restyle, but never block a safe post.
  const style = styleIssues(text);
  if (!issues.length && style.length) {
    const styled = await rewritePost({ text, issues: style, brief, maxChars }).catch(() => null);
    if (styled && !validatePostText(styled, brief, maxChars).length) text = styled;
  }

  if (issues.length) {
    text = text
      .replace(/https?:\/\/\S+|www\.\S+/gi, "")
      .replace(/(^|[\s(])@(\w)/g, "$1$2")
      .split(FARTGIRL_CA).join("")
      .split(FARTBOY_CA).join("")
      .trim();
    if (!brief.greetingPattern.test(text)) text = `${brief.greeting}\n\n${text}`;
    text = trimToLength(text, maxChars);
    issues = validatePostText(text, brief, maxChars);
  }

  if (issues.length) {
    throw new Error(`Post failed safety validation: ${issues.join(" ")}`);
  }
  return text;
}

export function buildDailyPostImagePrompt({ scene, imageMood }) {
  return [
    "FART GIRL — DAILY KEY ART. Future timeline: the comic is over and she is the most famous superhero on Earth, living in today's real world.",
    "STYLE: ONE single cinematic illustration, NOT a comic page — no panels, no gutters, no captions, no speech balloons. Bold confident ink linework, modern premium comic-book colouring, painterly lighting, rich depth, crisp focus on her.",
    [
      "CHARACTER LOCK (match the reference images exactly):",
      "- Lena Cole / Fart Girl, adult woman in her early twenties. Warm olive skin, oval face, straight dark brows, brown eyes, small straight nose, faint nick scar through the LEFT eyebrow, dark brown almost-black hair in a MESSY LOW BUN with a few loose strands.",
      "- Athletic, real proportions, heroic and confident. Not pin-up, not a child.",
      "- Simple dark-green eye MASK covering ONLY the eyes. Matte emerald bodysuit #0B6B3A with forest-green panels #0E3D24 on ribs, forearms and shins, thin luminous mint seam-lines #3DFF88 like glowing veins, fingerless gloves, low practical boots. NO cape, NO heels, NO cleavage window.",
      "- NEW IN THIS TIMELINE: the words \"FART GIRL\" are BUILT INTO the suit across the upper chest, never a flat sticker or printed text on top. The emblem is a moulded, slightly raised forest-green chest plate that is part of the suit's panelling; the letters are formed by the same luminous mint #3DFF88 seam-lines that run through the rest of the suit, in bold rounded comic lettering. It wraps around the curve of her chest and ribs, follows the fabric folds, catches the same light and shadow as the suit, and the seams flow into it seamlessly. Clearly legible and spelled exactly F-A-R-T G-I-R-L.",
      "- Hero state: no earrings.",
    ].join("\n"),
    "POWERS: luminous emerald-mint energy mist, shock-rings and electric vapour #3DFF88 swirling from her hands, aura or flight trail. Glowing, magical, chlorophyll-lightning feel. NEVER brown, never from her rear, nothing bodily.",
    `LIGHTING & MOOD: ${imageMood}`,
    `SCENE: ${scene}`,
    "TEXT IN IMAGE: only the FART GIRL chest emblem plus at most one short in-scene text of 4 words or fewer if the scene asks for it. No watermark, no title, no signature, no real brand logos.",
    "NEGATIVE: comic page layout, panels, gutters, speech bubbles, chibi, child, anime waifu, pin-up, sexy pose, cape, high heels, cleavage cutout, brown cloud, toilet humour, misspelled emblem, flat text overlay on the chest, sticker-like logo, floating or pasted-on lettering, earrings, extra unnamed superheroes, real celebrity likeness, different hair colour, blonde, red hair, changed face, photoreal, 3D render, watermark.",
  ].join("\n\n");
}

export async function persistDailyPostImage(key, image) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Missing BLOB_READ_WRITE_TOKEN");

  const extension = image.contentType.includes("png") ? "png" : "jpg";
  return put(`daily-posts/${key}.${extension}`, image.buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: image.contentType,
    cacheControlMaxAge: 31_536_000,
  });
}
