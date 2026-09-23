import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

const client = new MongoClient(process.env.MONGODB_URI);

try {
  const database = client.db(process.env.MONGODB_DB || "fartgirl");
  const pages = await database.collection("pages").find(
    { series: "project-chloris" },
    {
      projection: {
        _id: 0,
        pageId: 1,
        sourcePageId: 1,
        order: 1,
        complete: 1,
        publishStatus: 1,
        tweetId: 1,
        day: 1,
        slot: 1,
      },
      sort: { order: 1 },
    },
  ).toArray();
  const legacyFields = pages.filter((page) => page.day !== undefined || page.slot !== undefined).length;
  const published = pages
    .filter((page) => page.complete && page.tweetId)
    .map(({ pageId, order, tweetId }) => ({ pageId, order, tweetId }));

  console.log(JSON.stringify({
    total: pages.length,
    first: pages.slice(0, 10),
    legacyFields,
    published,
    next: pages.find((page) => !page.complete) || null,
  }, null, 2));
} finally {
  await client.close();
}