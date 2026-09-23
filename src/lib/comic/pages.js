import { getCollection } from "../mongo";

const COLLECTION = "pages";
const RECAP_COLLECTION = "comic_daily_recaps";
const CLAIM_LEASE_MS = 24 * 60 * 60 * 1000;
let indexesPromise;

async function collection() {
  const pages = await getCollection(COLLECTION);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      pages.createIndex({ pageId: 1 }, { unique: true }),
      pages.createIndex({ series: 1, complete: 1, order: 1 }),
      pages.createIndex({ publishStatus: 1, claimExpiresAt: 1 }),
    ]);
  }
  await indexesPromise;
  return pages;
}

export async function seedComicPages(seedPages) {
  const pages = await collection();
  const now = new Date();
  const retiredSeries = ["year", "one"].join("-");
  const retiredHashtag = ["#Year", "One"].join("");

  await pages.updateMany(
    { series: retiredSeries },
    { $set: { series: "project-chloris", updatedAt: now } },
  );
  await pages.updateMany(
    { hashtags: retiredHashtag },
    { $pull: { hashtags: retiredHashtag } },
  );
  await pages.updateMany(
    { series: "project-chloris" },
    { $addToSet: { hashtags: "#ProjectChloris" } },
  );

  const insertResult = await pages.bulkWrite(seedPages.map((page) => ({
    updateOne: {
      filter: { pageId: page.pageId },
      update: {
        $setOnInsert: {
          ...page,
          complete: page.complete ?? false,
          publishStatus: page.publishStatus || "pending",
          createdAt: now,
          updatedAt: now,
        },
      },
      upsert: true,
    },
  })), { ordered: false });

  const syncResult = await pages.bulkWrite(seedPages.map((page) => {
    const sourceFields = { ...page };
    delete sourceFields.complete;
    return {
      updateOne: {
        filter: { pageId: page.pageId, complete: false },
        update: { $set: { ...sourceFields, updatedAt: now } },
      },
    };
  }), { ordered: false });

  await pages.bulkWrite(seedPages.map((page) => ({
    updateOne: {
      filter: { pageId: page.pageId },
      update: { $set: { altText: page.altText, updatedAt: now } },
    },
  })), { ordered: false });

  return {
    total: seedPages.length,
    inserted: insertResult.upsertedCount,
    existing: insertResult.matchedCount,
    syncedUnpublished: syncResult.matchedCount,
  };
}

export async function peekNextComicPage() {
  const pages = await collection();
  return pages.findOne(
    { series: "project-chloris", complete: false },
    { sort: { order: 1 } },
  );
}

export async function claimNextComicPage(claimId) {
  const pages = await collection();
  const now = new Date();

  return pages.findOneAndUpdate(
    {
      series: "project-chloris",
      complete: false,
      publishStatus: { $nin: ["published"] },
      $or: [
        { publishStatus: { $in: ["pending", "failed"] } },
        { publishStatus: { $exists: false } },
        { publishStatus: "processing", claimExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        publishStatus: "processing",
        claimId,
        claimedAt: now,
        claimExpiresAt: new Date(now.getTime() + CLAIM_LEASE_MS),
        updatedAt: now,
      },
      $inc: { publishAttempts: 1 },
      $unset: { lastError: "" },
    },
    {
      sort: { order: 1 },
      returnDocument: "after",
      includeResultMetadata: false,
    },
  );
}

export async function markComicPagePublished(page, result) {
  const pages = await collection();
  const now = new Date();
  const update = await pages.updateOne(
    {
      pageId: page.pageId,
      claimId: page.claimId,
      publishStatus: "processing",
    },
    {
      $set: {
        complete: true,
        publishStatus: "published",
        completedAt: now,
        publishedAt: now,
        tweetId: result.tweetId,
        generatedImageUrl: result.generatedImageUrl,
        altText: result.altText,
        updatedAt: now,
      },
      $unset: { claimId: "", claimExpiresAt: "", lastError: "" },
    },
  );

  if (update.modifiedCount !== 1) {
    throw new Error(`Lost publish claim for ${page.pageId}`);
  }
}

export async function markComicPageFailed(page, error) {
  const pages = await collection();
  await pages.updateOne(
    { pageId: page.pageId, claimId: page.claimId },
    {
      $set: {
        publishStatus: "failed",
        lastError: String(error?.message || error).slice(0, 1000),
        lastFailedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { claimId: "", claimExpiresAt: "" },
    },
  );
}

export async function listPublishedComicPages() {
  const pages = await collection();
  const published = await pages.find(
    {
      series: "project-chloris",
      complete: true,
      generatedImageUrl: { $type: "string", $ne: "" },
    },
    {
      projection: {
        _id: 0,
        pageId: 1,
        order: 1,
        day: 1,
        date: 1,
        slot: 1,
        arcId: 1,
        arcTitle: 1,
        dayFocus: 1,
        caption: 1,
        hashtags: 1,
        generatedImageUrl: 1,
        altText: 1,
        tweetId: 1,
        publishedAt: 1,
      },
      sort: { order: 1 },
    },
  ).toArray();

  return published.map((page) => ({
    ...page,
    publishedAt: page.publishedAt instanceof Date
      ? page.publishedAt.toISOString()
      : page.publishedAt || null,
  }));
}

async function recapsCollection() {
  const recaps = await getCollection(RECAP_COLLECTION);
  await recaps.createIndex({ series: 1, day: 1 }, { unique: true });
  return recaps;
}

export async function claimNextDailyRecap(claimId) {
  const pages = await collection();
  const recaps = await recapsCollection();
  const fourthPages = await pages.find({
    series: "project-chloris",
    slot: 4,
    recapEligible: true,
    publishStatus: "published",
  }, {
    projection: { day: 1, date: 1 },
    sort: { day: 1 },
  }).toArray();

  for (const fourthPage of fourthPages) {
    const dayPages = await pages.find({
      series: "project-chloris",
      day: fourthPage.day,
      publishStatus: "published",
    }, {
      projection: { _id: 0, pageId: 1, order: 1, day: 1, date: 1, slot: 1, caption: 1, altText: 1, generatedImageUrl: 1 },
      sort: { slot: 1 },
    }).toArray();
    if (dayPages.length !== 4 || ![1, 2, 3, 4].every((slot, index) => dayPages[index]?.slot === slot)) {
      continue;
    }

    const recap = await recaps.findOneAndUpdate(
      {
        series: "project-chloris",
        day: fourthPage.day,
        $or: [
          { publishStatus: { $in: ["pending", "failed"] } },
          { publishStatus: { $exists: false } },
        ],
      },
      {
        $set: {
          series: "project-chloris",
          day: fourthPage.day,
          date: fourthPage.date,
          pageIds: dayPages.map((page) => page.pageId),
          publishStatus: "processing",
          claimId,
          claimedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
        $inc: { publishAttempts: 1 },
        $unset: { lastError: "" },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: false },
    );
    if (recap) return { recap, pages: dayPages };
  }

  return null;
}

export async function markDailyRecapPublished(recap, result) {
  const recaps = await recapsCollection();
  const update = await recaps.updateOne(
    { _id: recap._id, claimId: recap.claimId, publishStatus: "processing" },
    {
      $set: {
        publishStatus: "published",
        tweetId: result.tweetId,
        text: result.text,
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { claimId: "", lastError: "" },
    },
  );
  if (update.modifiedCount !== 1) {
    throw new Error(`Lost daily recap claim for day ${recap.day}`);
  }
}

export async function markDailyRecapFailed(recap, error) {
  const recaps = await recapsCollection();
  await recaps.updateOne(
    { _id: recap._id, claimId: recap.claimId },
    {
      $set: {
        publishStatus: "failed",
        lastError: String(error?.message || error).slice(0, 1000),
        lastFailedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { claimId: "" },
    },
  );
}