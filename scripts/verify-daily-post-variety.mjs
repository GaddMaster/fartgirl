import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const route = fs.readFileSync(new URL("../src/app/api/daily-post/route.js", import.meta.url), "utf8");
const content = fs.readFileSync(new URL("../src/lib/daily-posts/content.js", import.meta.url), "utf8");
const store = fs.readFileSync(new URL("../src/lib/daily-posts/store.js", import.meta.url), "utf8");
const scenes = fs.readFileSync(new URL("../src/lib/daily-posts/scenes.js", import.meta.url), "utf8");
const references = fs.readFileSync(new URL("../src/lib/daily-posts/references.js", import.meta.url), "utf8");
const names = new Set(["DAILY_POST_DAYS", "DAYLIGHT", "WEEKEND", "WORKDAYS", "scene", "DAILY_POST_SCENES", "selectDailyPostScene", "REFERENCE_BASE", "DAILY_POST_CHARACTER", "DAILY_POST_COSTUMES", "DAILY_POST_REFERENCES", "selectDailyPostReferences", "DAILY_POST_COMPOSITIONS", "DAILY_POST_EXPRESSIONS", "DAILY_POST_FOCUSED_EXPRESSIONS", "DAILY_POST_LIGHTING", "HARD_BANNED", "pickFreshValue", "pickVisualDirection", "buildUserPrompt", "formatRecentPosts", "buildDailyPostImagePrompt", "xWeightedLength", "normalizePostText", "validatePostText"]);
const select = (source) => {
  const file = ts.createSourceFile("source.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  return file.statements.filter((statement) => {
    if (ts.isFunctionDeclaration(statement)) return names.has(statement.name?.text);
    if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.some((declaration) => names.has(declaration.name.getText(file)));
    return false;
  }).map((statement) => statement.getText(file).replace(/^export\s+/, "")).join("\n");
};
const context = vm.createContext({ Math, JSON, FARTGIRL_CA: "FARTGIRL_CA_TEST", FARTBOY_CA: "FARTBOY_CA_TEST" });
vm.runInContext(`${select(scenes)}\n${select(references)}\n${select(route)}\n${select(content)}\nglobalThis.helpers = { scenes: DAILY_POST_SCENES, days: DAILY_POST_DAYS, references: DAILY_POST_REFERENCES, costumes: DAILY_POST_COSTUMES, selectDailyPostScene, selectDailyPostReferences, pickVisualDirection, buildUserPrompt, buildDailyPostImagePrompt, normalizePostText, validatePostText };`, context);
const { scenes: catalog, days, references: assets, costumes, selectDailyPostScene, selectDailyPostReferences, pickVisualDirection, buildUserPrompt, buildDailyPostImagePrompt, normalizePostText, validatePostText } = context.helpers;

assert.equal(normalizePostText("one\u2014two"), "one-two");
assert(!normalizePostText("one\u2014two").includes("\u2014"));
assert(validatePostText("GM\n\nA calm market update.\n\nHow are you feeling?\u2014", { greeting: "GM", greetingPattern: /^GM/i }, 280).some((issue) => issue.includes("em dash")));
assert(route.includes("result.text = normalizePostText(result.text);"));

assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length);
assert.equal(new Set(catalog.map((item) => item.activity)).size, catalog.length);
assert.equal(assets.length, 12);
assert.equal(new Set(assets.map((item) => item.url)).size, 12);
assert(assets.find((item) => item.id === "cape-purple").url.endsWith("b9f4a098-ee9a-4c1e-b324-0ee4a81fc7d5.jpg"));
assert.equal(costumes.length, 3);
assert(!content.includes("comicManifest"));
assert(route.includes("selectDailyPostReferences(result.visualDirection)"));
assert(route.includes("const clock = getDublinClock(now)"));
assert(route.includes("result.visualDirection?.characterId !== DAILY_POST_CHARACTER.id"));
assert(route.includes("!result.visualDirection?.permittedDays?.includes(getDublinClock(now).weekday)"));

for (const item of catalog) {
  assert(item.logistics);
  assert(item.days.length);
  assert(item.days.every((day) => days.includes(day)));
  if (item.wardrobe === "off-duty") assert(item.clothes);
}
assert.equal(JSON.stringify(catalog.find((item) => item.id === "weekend-club").days), JSON.stringify(["Friday", "Saturday"]));
assert.throws(() => selectDailyPostScene("gm", "Notaday"));
assert.throws(() => selectDailyPostScene("invalid", "Monday"));

let selections = 0;
for (const weekday of days) for (const type of ["gm", "gd", "gn"]) {
  const clock = { weekday, date: "2026-10-17", time: "08:30", isWeekend: ["Saturday", "Sunday"].includes(weekday) };
  const eligible = catalog.filter((item) => item.types.includes(type) && item.days.includes(weekday));
  assert(eligible.length >= 20);
  const recent = [];
  for (let index = 0; index < eligible.length * 3; index += 1) {
    const direction = pickVisualDirection(type, recent, undefined, clock);
    assert(direction.permittedDays.includes(weekday));
    assert.equal(direction.characterId, "fartgirl-celebrity-v1");
    assert(!recent.slice(0, eligible.length - 1).some((post) => post.visualDirection.sceneId === direction.sceneId));
    assert(!recent.slice(0, 11).some((post) => post.visualDirection.composition === direction.composition));
    const focused = ["rescue", "crime"].includes(direction.category);
    assert(!recent.slice(0, focused ? 5 : 9).some((post) => post.visualDirection.expression === direction.expression));
    if (focused) assert(!/yawn|laugh|smirk|sleepy/i.test(direction.expression));
    const assigned = catalog.find((item) => item.id === direction.sceneId);
    if (assigned.lighting) assert.equal(direction.lighting, assigned.lighting);
    const selectedReferences = selectDailyPostReferences(direction);
    assert(selectedReferences.every((item) => item.costumeId === direction.costumeId));
    assert(selectedReferences.length <= 2);
    if (direction.wardrobe === "off-duty") {
      assert.equal(selectedReferences.length, 1);
      assert(selectedReferences[0].use.includes("IDENTITY ONLY"));
    }
    const prompt = buildDailyPostImagePrompt({ scene: "Detailed task scene", imageMood: direction.lighting, visualDirection: direction, recentScenes: ["Previous scene"] });
    for (const key of ["activity", "logistics", "clothes", "weekday", "composition", "expression", "lighting"]) assert(prompt.includes(direction[key]), key);
    assert(prompt.includes("Previous scene"));
    assert(prompt.includes("CHARACTER LOCK"));
    assert(!prompt.includes("NO cape"));
    assert(!prompt.includes("MESSY LOW BUN"));
    recent.unshift({ type, visualDirection: direction });
    selections += 1;
  }
  const previous = recent[0].visualDirection;
  const regenerated = pickVisualDirection(type, [], previous, clock);
  assert.notEqual(regenerated.activity, previous.activity);
  assert.notEqual(regenerated.composition, previous.composition);
  assert.notEqual(regenerated.expression, previous.expression);
  assert.notEqual(regenerated.costumeId, previous.costumeId);
  const fromDraft = pickVisualDirection(type, [{ draft: { visualDirection: previous } }], undefined, clock);
  assert.notEqual(fromDraft.activity, previous.activity);

  const writingPrompt = buildUserPrompt({ type, brief: { label: type, activityTheme: previous.activity, research: [], mustInclude: [] }, format: {}, coinFocus: {}, clock, marketBlock: "", recent: [], maxChars: 280, visualDirection: previous });
  assert(writingPrompt.includes(`WEEKDAY CONTEXT: ${weekday}`));
  assert(writingPrompt.includes(previous.logistics));
}

const shared = catalog.find((item) => item.types.length === 2 && item.days.includes("Monday"));
const sharedHistory = [{ type: "gm", visualDirection: { type: "gm", sceneId: shared.id, activity: shared.activity } }];
assert.notEqual(pickVisualDirection("gd", sharedHistory, undefined, { weekday: "Monday" }).sceneId, shared.id);
assert(buildDailyPostImagePrompt({ scene: "Legacy saved scene", imageMood: "Daylight" }).includes("Legacy saved scene"));
assert(content.includes("MANDATORY VISUAL DIRECTION"));
assert(/visualDirection,\r?\n/.test(route));
assert(store.includes('"draft.visualDirection": 1'));

const routeCode = ts.transpileModule(route, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const currentDirection = pickVisualDirection("gm", [], undefined, { weekday: "Saturday" });

async function verifyRouteDraft({ existing, image = false }) {
  const calls = { research: 0, saved: 0, generated: 0, references: null, draft: null };
  const contentMock = {
    DAILY_POST_MAX_CHARS: 280,
    buildDailyPostImagePrompt,
    normalizePostText,
    finalizePostText: async (text) => text,
    researchAndWritePost: async () => {
      calls.research += 1;
      return { text: "GM\n\nCity saved.\n\nHow is your morning?", headline: "City morning", topics: [], facts: [], citations: [], scene: "Assigned city morning", altText: "City scene" };
    },
    persistDailyPostImage: async () => ({ url: "https://example.test/new-daily-image.jpg" }),
  };
  const mocks = {
    "node:crypto": { randomUUID: () => "offline-trace" },
    "@/lib/comic/content": { generateComicImage: async (_prompt, references) => {
      calls.generated += 1;
      calls.references = references;
      return { buffer: Buffer.from("offline-image"), contentType: "image/jpeg" };
    } },
    "@/lib/comic/twitter": {
      assertExpectedXAccount: async () => { throw new Error("Unexpected X account access"); },
      postComicToX: async () => { throw new Error("Unexpected X publish"); },
    },
    "@/lib/daily-posts/content": contentMock,
    "@/lib/daily-posts/market": { getMarketSnapshot: async () => ({ errors: [] }), formatMarketSnapshot: () => "Offline market" },
    "@/lib/daily-posts/qstash": { verifyDailyPostRequest: async () => ({ authorized: true, via: "bearer", bodyText: "{}" }) },
    "@/lib/daily-posts/references": { DAILY_POST_CHARACTER: { id: "fartgirl-celebrity-v1" }, DAILY_POST_COSTUMES: costumes, selectDailyPostReferences },
    "@/lib/daily-posts/scenes": { selectDailyPostScene },
    "@/lib/daily-posts/schedule": {
      getDublinClock: () => ({ weekday: "Saturday", date: "2026-10-17", time: "08:30", isWeekend: true }),
      getDublinDate: () => "2026-10-17",
    },
    "@/lib/daily-posts/store": {
      getDailyPost: async () => existing,
      listRecentDailyPosts: async () => [],
      saveDailyPostDraft: async ({ draft }) => { calls.saved += 1; calls.draft = draft; },
    },
  };
  const exports = {};
  vm.runInNewContext(routeCode, {
    exports,
    require: (name) => {
      assert(name in mocks, `Unexpected import ${name}`);
      return mocks[name];
    },
    URL, Response, Buffer,
    process: { env: {} },
    console: { log: () => {} },
    fetch: () => { throw new Error("Unexpected network request"); },
  });
  const response = await exports.POST({ url: `https://example.test/api/daily-post?type=gm&preview=1${image ? "&image=1" : ""}` });
  assert.equal(response.status, 200);
  return { calls, body: await response.json() };
}

const currentDraft = { text: "GM\n\nSaved daily text.\n\nReady?", scene: "Saved scene", imagePrompt: "Saved prompt", visualDirection: currentDirection, imageUrl: "https://example.test/saved-daily.jpg" };
const reused = await verifyRouteDraft({ existing: { draft: currentDraft } });
assert.equal(reused.calls.research, 0);
assert.equal(reused.body.imageUrl, currentDraft.imageUrl);
assert.equal(reused.calls.saved, 1);

const migrated = await verifyRouteDraft({ existing: { draft: { text: "Legacy text", imagePrompt: "Old comic design", imageUrl: "https://example.test/legacy.jpg" } }, image: true });
assert.equal(migrated.calls.research, 1);
assert.equal(migrated.calls.generated, 1);
assert(migrated.calls.references.length <= 2);
assert(migrated.calls.references.every((reference) => reference.url.includes("/character-v1/")));
assert.equal(migrated.body.visualDirection.characterId, "fartgirl-celebrity-v1");
assert.equal(migrated.body.imageUrl, "https://example.test/new-daily-image.jpg");
assert(!migrated.calls.draft.imagePrompt.includes("Old comic design"));

const wrongDay = await verifyRouteDraft({ existing: { draft: { ...currentDraft, visualDirection: { ...currentDirection, permittedDays: ["Friday"] } } } });
assert.equal(wrongDay.calls.research, 1);
assert.equal(wrongDay.body.imageUrl, undefined);

const published = await verifyRouteDraft({ existing: { publishStatus: "published", tweetId: "already-posted", draft: currentDraft } });
assert.equal(published.body.skipped, true);
assert.equal(published.calls.saved, 0);
assert.equal(published.calls.research, 0);

console.log(`PASS: ${catalog.length} scenes, ${selections} selections across all weekdays/slots, cross-slot cooldowns, 12 corrected references, costume isolation, wardrobe/logistics/lighting propagation, regeneration and history projection.`);
console.log("PASS: mocked route preserves current drafts, refreshes legacy/wrong-weekday drafts, passes only daily references to image generation and leaves published posts untouched. No network or database access.");