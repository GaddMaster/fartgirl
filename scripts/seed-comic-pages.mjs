import { MongoClient } from "mongodb";

import { getComicCatalog } from "../src/lib/comic/catalog.js";

if (!process.env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

const client = new MongoClient(process.env.MONGODB_URI);

try {
  const collection = client.db(process.env.MONGODB_DB || "fartgirl").collection("pages");
  await collection.createIndex({ pageId: 1 }, { unique: true });
  await collection.createIndex({ series: 1, complete: 1, order: 1 });

  const now = new Date();
  const retiredSeries = ["year", "one"].join("-");
  const retiredHashtag = ["#Year", "One"].join("");

  await collection.updateMany(
    { series: retiredSeries },
    { $set: { series: "project-chloris", updatedAt: now } },
  );
  await collection.updateMany(
    { hashtags: retiredHashtag },
    { $pull: { hashtags: retiredHashtag } },
  );
  await collection.updateMany(
    { series: "project-chloris" },
    { $addToSet: { hashtags: "#ProjectChloris" } },
  );

  const pages = getComicCatalog();
  const insertResult = await collection.bulkWrite(pages.map((page) => ({
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

  const syncResult = await collection.bulkWrite(pages.map((page) => {
    const sourceFields = { ...page };
    delete sourceFields.complete;
    return {
      updateOne: {
        filter: { pageId: page.pageId, complete: false },
        update: { $set: { ...sourceFields, updatedAt: now } },
      },
    };
  }), { ordered: false });

  await collection.bulkWrite(pages.map((page) => ({
    updateOne: {
      filter: { pageId: page.pageId },
      update: { $set: { altText: page.altText, updatedAt: now } },
    },
  })), { ordered: false });

  console.log(JSON.stringify({
    total: pages.length,
    inserted: insertResult.upsertedCount,
    existing: insertResult.matchedCount,
    syncedUnpublished: syncResult.matchedCount,
  }, null, 2));
} finally {
  await client.close();
}