import { getCollection } from "@/lib/mongo";

const COLLECTION = "daily_posts";
const CLAIM_TTL_MS = 15 * 60_000;

async function collection() {
  const posts = await getCollection(COLLECTION);
  await Promise.all([
    posts.createIndex({ postKey: 1 }, { unique: true }),
    posts.createIndex({ publishStatus: 1, publishedAt: -1 }),
  ]);
  return posts;
}

const isDuplicateKey = (error) => error?.code === 11000;

export async function reserveDailyPostSchedule({ postKey, type, date, scheduledFor }) {
  const posts = await collection();
  const now = new Date();
  try {
    await posts.insertOne({
      postKey,
      type,
      date,
      scheduleStatus: "scheduling",
      scheduledFor,
      publishStatus: "pending",
      publishAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });
    return true;
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  // Also adopts records created by a preview draft (no scheduleStatus yet).
  const retry = await posts.updateOne(
    { postKey, scheduleStatus: { $in: ["schedule_failed", null] }, publishStatus: { $nin: ["published", "posted_unconfirmed"] } },
    { $set: { scheduleStatus: "scheduling", scheduledFor, updatedAt: now } },
  );
  return retry.modifiedCount === 1;
}

export async function markDailyPostScheduled(postKey, { messageId, scheduledFor }) {
  const posts = await collection();
  await posts.updateOne(
    { postKey },
    {
      $set: { scheduleStatus: "scheduled", qstashMessageId: messageId, scheduledFor, updatedAt: new Date() },
      $unset: { scheduleError: "" },
    },
  );
}

export async function markDailyPostScheduleFailed(postKey, error) {
  const posts = await collection();
  await posts.updateOne(
    { postKey },
    {
      $set: {
        scheduleStatus: "schedule_failed",
        scheduleError: String(error?.message || error).slice(0, 1000),
        updatedAt: new Date(),
      },
    },
  );
}

export async function getDailyPost(postKey) {
  const posts = await collection();
  return posts.findOne({ postKey }, { projection: { _id: 0 } });
}

export async function saveDailyPostDraft({ postKey, type, date, draft }) {
  const posts = await collection();
  const now = new Date();
  try {
    await posts.updateOne(
      { postKey, publishStatus: { $nin: ["published", "posted_unconfirmed", "processing"] } },
      {
        $set: { draft, draftUpdatedAt: now, updatedAt: now },
        $setOnInsert: { postKey, type, date, publishStatus: "pending", publishAttempts: 0, createdAt: now },
      },
      { upsert: true },
    );
  } catch (error) {
    // Record is published or mid-publish; leave it untouched.
    if (!isDuplicateKey(error)) throw error;
  }
}

export async function attachDraftToClaim(post, draft) {
  const posts = await collection();
  await posts.updateOne(
    { _id: post._id, claimId: post.claimId },
    { $set: { draft, draftUpdatedAt: new Date(), updatedAt: new Date() } },
  );
}

export async function claimDailyPost({ postKey, type, date, claimId }) {
  const posts = await collection();
  const now = new Date();
  try {
    return await posts.findOneAndUpdate(
      {
        postKey,
        $or: [
          { publishStatus: { $in: ["pending", "failed"] } },
          { publishStatus: { $exists: false } },
          { publishStatus: "processing", claimExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          publishStatus: "processing",
          claimId,
          claimedAt: now,
          claimExpiresAt: new Date(now.getTime() + CLAIM_TTL_MS),
          updatedAt: now,
        },
        $setOnInsert: { postKey, type, date, createdAt: now },
        $inc: { publishAttempts: 1 },
        $unset: { lastError: "" },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: false },
    );
  } catch (error) {
    // Already published / posted_unconfirmed / actively processing.
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}

export async function markDailyPostPublished(post, result) {
  const posts = await collection();
  const update = await posts.updateOne(
    { _id: post._id, claimId: post.claimId, publishStatus: "processing" },
    {
      $set: { ...result, publishStatus: "published", publishedAt: new Date(), updatedAt: new Date() },
      $unset: { claimId: "", claimExpiresAt: "", lastError: "" },
    },
  );
  if (update.modifiedCount !== 1) {
    throw new Error(`Lost daily post claim for ${post.postKey}`);
  }
}

export async function markDailyPostPostedUnconfirmed(post, result, error) {
  const posts = await collection();
  await posts.updateOne(
    { _id: post._id },
    {
      $set: {
        ...result,
        publishStatus: "posted_unconfirmed",
        postConfirmationError: String(error?.message || error).slice(0, 1000),
        postedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { claimId: "", claimExpiresAt: "" },
    },
  );
}

export async function markDailyPostFailed(post, error) {
  const posts = await collection();
  await posts.updateOne(
    { _id: post._id, claimId: post.claimId },
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

export async function listRecentDailyPosts(limit = 12) {
  const posts = await collection();
  return posts.find(
    { publishStatus: { $in: ["published", "posted_unconfirmed"] } },
    {
      projection: { _id: 0, type: 1, date: 1, format: 1, headline: 1, topics: 1, scene: 1, text: 1, visualDirection: 1, "draft.visualDirection": 1 },
      sort: { publishedAt: -1, postedAt: -1 },
      limit,
    },
  ).toArray();
}
