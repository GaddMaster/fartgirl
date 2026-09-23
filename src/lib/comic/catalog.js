import { pages as sourcePages } from "../../app/assets/project_chloris.js";

const HISTORICAL_SOURCE_DAYS = new Set([1, 2]);

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
  const scene = cleanText(finalPage.sceneShort);

  const page = {
    legacyPageId: `D${String(finalPage.day).padStart(3, "0")}-P4`,
    series: "project-chloris",
    arcId: finalPage.arcId,
    arcTitle: finalPage.arcTitle,
    dayFocus: finalPage.dayFocus,
    caption: `The moment does not end when I leave.\n\n${finalPage.caption.split("\n").at(-1)}\n\nSomething waits after the last panel.`,
    hashtags: finalPage.hashtags,
    panelCount: 2,
    layout: "two stacked coda",
    state: finalPage.state,
    sceneShort: `Coda to today’s comic. Continue the same story and location from the prior page: ${scene} Final panel: a quiet new threat, clue, or unresolved green glow that carries the story into tomorrow.`,
    imagePrompt: `[PREPEND bible.image_consistency_prompt]\nTHIS PAGE: Panel count: 2. Layout: two stacked coda.\nSCENE: Continue directly from the prior three pages. ${scene} End on a quiet cliffhanger for the next page.\nKeep Lena recognizable. Emerald gas only. Comic gutters visible.`,
    refImageIds: finalPage.refImageIds,
    complete: false,
    publishStatus: "pending",
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
      .forEach((page) => catalog.push({ ...page, legacyPageId: page.pageId }));
    if (!HISTORICAL_SOURCE_DAYS.has(dayPages[0].day)) {
      catalog.push(buildFourthPage(dayPages));
    }
  });

  return catalog.map((page, index) => {
    const record = {
      ...page,
      pageId: `P${index + 1}`,
      order: index + 1,
      sourcePageId: page.legacyPageId,
      altText: buildStoredAltText({ ...page, order: index + 1 }),
    };
    delete record.legacyPageId;
    delete record.day;
    delete record.date;
    delete record.slot;
    delete record.suggestedTime;
    delete record.recapEligible;
    return record;
  });
}