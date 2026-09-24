import comicManifest from "@/app/assets/comic_manifest";
import { imagineBaseline } from "@/app/assets/imagine_baseline";
import { put } from "@vercel/blob";

const X_MAX_CHARS = 280;
const DAILY_RECAP_HEADER = "Project Chloris Daily recap";
const RETIRED_BRANDING = /year[\s_-]*one/gi;
const HAS_RETIRED_BRANDING = /year[\s_-]*one/i;

function stripRetiredBranding(value) {
  return String(value || "")
    .replace(RETIRED_BRANDING, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function cleanScenePrompt(value) {
  return stripRetiredBranding(value)
    .replace(/^\[PREPEND bible\.image_consistency_prompt\]\s*/i, "")
    .trim();
}

export function buildComicImagePrompt(page) {
  const stateLine = imagineBaseline.state_lines[page.state]
    || imagineBaseline.state_lines.both;

  return stripRetiredBranding([
    imagineBaseline.prompt.full,
    stateLine,
    cleanScenePrompt(page.imagePrompt || page.sceneShort),
    "FORMAT OVERRIDE: Generate one square comic page at exactly 1:1. Keep all panels, gutters, captions, and characters fully inside the square frame. Do not generate a portrait or 2:3 page.",
    `Do not print any series title, branding header, generation label, or metadata unless the scene explicitly requests visible text.\nNEGATIVE: ${imagineBaseline.prompt.negative}`,
  ].filter(Boolean).join("\n\n"));
}

export function resolveComicReferences(page) {
  const items = comicManifest.items || [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const byFile = new Map(items.map((item) => [item.file, item]));
  const requested = [
    ...(comicManifest.always_attach || []),
    ...(page.refImageIds || []),
  ];
  const seen = new Set();

  return requested
    .map((key) => byId.get(key) || byFile.get(key))
    .filter((item) => item?.url && !seen.has(item.url) && seen.add(item.url))
    .slice(0, comicManifest.max_refs_suggested || 4)
    .map(({ id, file, url, use }) => ({ id, file, url, use }));
}

export function buildComicXText(page) {
  const pageNumber = Number.isInteger(page.order) && page.order > 0
    ? page.order
    : 1;
  const headline = `Fart Girl Comic - Page ${pageNumber} 📗`;
  const prefix = `${headline}\n\n`;
  const tags = Array.isArray(page.hashtags)
    ? page.hashtags.filter((tag) => !HAS_RETIRED_BRANDING.test(tag)).join(" ")
    : "";
  const suffix = tags ? `\n\n${tags}` : "";
  const caption = stripRetiredBranding(page.caption)
    .replace(/\r?\n+/g, "\n\n");
  const maxCaptionLength = X_MAX_CHARS - prefix.length - suffix.length;
  const body = caption.length > maxCaptionLength
    ? `${caption.slice(0, Math.max(0, maxCaptionLength - 1)).trimEnd()}…`
    : caption;

  return `${prefix}${body}${suffix}`.slice(0, X_MAX_CHARS);
}

export function buildComicAltText(page) {
  const pageNumber = Number.isInteger(page.order) && page.order > 0
    ? page.order
    : 1;
  const scene = cleanScenePrompt(page.sceneShort || page.imagePrompt || "");
  const focus = stripRetiredBranding(page.dayFocus || "");
  const description = [
    `Fart Girl comic page ${pageNumber}.`,
    focus ? `${focus}.` : "",
    scene,
  ].filter(Boolean).join(" ");

  return description.slice(0, 1000);
}

export async function generateDailyRecap(pages) {
  if (!process.env.XAI_API_KEY) {
    throw new Error("Missing XAI_API_KEY");
  }

  const story = pages.map((page) => [
    `PAGE ${page.order}:`,
    page.caption,
  ].join("\n")).join("\n\n");
  const prefix = `${DAILY_RECAP_HEADER}\n\n`;
  const maxSummaryLength = X_MAX_CHARS - prefix.length;
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.COMIC_RECAP_MODEL || "grok-4.3",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Write concise X recap posts for PROJECT CHLORIS. Return JSON only, shaped exactly as {\"text\": \"...\"} with no other keys. Keep the voice intimate, cinematic, and grounded. Use 2-4 short lines separated by blank lines. Add at most two fitting emojis at line ends. End with #FartGirl #ProjectChloris. Do not add a title; the publisher adds it. Never mention AI, prompts, page numbers, or meta commentary.",
        },
        {
          role: "user",
          content: `Summarize these four comic pages into one X post under ${maxSummaryLength} characters:\n\n${story}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI daily recap failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const parsedText = parsed && typeof parsed === "object"
    ? (parsed.text || parsed.summary || parsed.post || parsed.caption || parsed.content)
    : null;
  const summary = String(parsedText || raw)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/\r?\n+/g, "\n\n")
    .trim();
  if (!summary) {
    throw new Error("xAI daily recap returned no text");
  }

  return `${prefix}${summary}`.slice(0, X_MAX_CHARS);
}

export async function generateComicImage(prompt, references) {
  if (!process.env.XAI_API_KEY) {
    throw new Error("Missing XAI_API_KEY");
  }

  const referenceGuide = references
    .map((reference, index) => `<IMAGE_${index}>: ${reference.use || reference.file}`)
    .join("\n");
  const promptWithReferences = referenceGuide
    ? `${prompt}\n\nREFERENCE GUIDE:\n${referenceGuide}`
    : prompt;

  const response = await fetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.COMIC_IMAGE_MODEL || "grok-imagine-image-2.0",
      prompt: promptWithReferences,
      images: references.map(({ url }) => ({ url })),
      n: 1,
      aspect_ratio: "1:1",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`xAI image generation failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  const result = await response.json();
  const url = result?.data?.[0]?.url;
  if (!url) {
    throw new Error("xAI image generation returned no image URL");
  }

  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Generated image download failed (${imageResponse.status})`);
  }

  return {
    url,
    buffer: Buffer.from(await imageResponse.arrayBuffer()),
    contentType: imageResponse.headers.get("content-type") || "image/jpeg",
  };
}

export async function persistComicImage(pageId, image) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }

  const extension = image.contentType.includes("png") ? "png" : "jpg";
  return put(`comic/project-chloris/${pageId}.${extension}`, image.buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: image.contentType,
    cacheControlMaxAge: 31_536_000,
  });
}