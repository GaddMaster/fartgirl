import { pages as sourcePages } from "../../app/assets/project_chloris.js";

const HISTORICAL_DAYS = new Set([1, 2]);

function cleanText(value) {
  return String(value || "")
    .replace(/^\[PREPEND bible\.image_consistency_prompt\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStoredAltText(page) {
  const scene = cleanText(page.sceneShort || page.imagePrompt);
  const focus = cleanText(page.dayFocus);
  return [
    `Fart Girl comic page ${page.order}.`,
    focus,
    scene,
  ].filter(Boolean).join(" ").slice(0, 1000);
}

function buildFourthPage(dayPages) {
  const finalPage = dayPages.at(-1);
  const historicalSkip = HISTORICAL_DAYS.has(finalPage.day);
  const scene = cleanText(finalPage.sceneShort);

  const page = {
    pageId: `D${String(finalPage.day).padStart(3, "0")}-P4`,
    series: "project-chloris",
    day: finalPage.day,
    date: finalPage.date,
    slot: 4,
    suggestedTime: "20:00",
    arcId: finalPage.arcId,
    arcTitle: finalPage.arcTitle,
    dayFocus: finalPage.dayFocus,
    caption: `The night does not end when I leave.\n\n${finalPage.caption.split("\n").at(-1)}\n\nSomething waits after the last panel.`,
    hashtags: finalPage.hashtags,
    panelCount: 2,
    layout: "two stacked coda",
    state: finalPage.state,
    sceneShort: `Coda to today’s comic. Continue the same story and location from the prior page: ${scene} Final panel: a quiet new threat, clue, or unresolved green glow that carries the story into tomorrow.`,
    imagePrompt: `[PREPEND bible.image_consistency_prompt]\nTHIS PAGE: Day ${finalPage.day}, page 4 of 4. Panel count: 2. Layout: two stacked coda.\nSCENE: Continue directly from the prior three pages. ${scene} End on a quiet cliffhanger for tomorrow.\nKeep Lena recognizable. Emerald gas only. Comic gutters visible.`,
    refImageIds: finalPage.refImageIds,
    complete: historicalSkip,
    publishStatus: historicalSkip ? "skipped" : "pending",
    recapEligible: !historicalSkip,
    ...(historicalSkip ? { skipReason: "Fourth daily slot introduced after this story day had already published." } : {}),
  };

  return page;
}

export function getComicCatalog() {
  const byDay = new Map();
  sourcePages.forEach((page) => {
    const day = byDay.get(page.day) || [];
    day.push(page);
    byDay.set(page.day, day);
  });

  const catalog = [];
  [...byDay.values()].forEach((dayPages) => {
    dayPages
      .sort((a, b) => a.slot - b.slot)
      .forEach((page) => catalog.push({ ...page }));
    catalog.push(buildFourthPage(dayPages));
  });

  return catalog.map((page, index) => ({
    ...page,
    order: index + 1,
    altText: buildStoredAltText({ ...page, order: index + 1 }),
  }));
}