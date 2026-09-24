import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

const options = {
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 20_000,
  maxPoolSize: 10,
};

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 600;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function invalidate() {
  globalThis._fartGirlMongoPromise = null;
}

function connectClient() {
  const client = new MongoClient(uri, options);
  // A dead/stale socket (e.g. after a frozen instance thaws) fires these
  // without a fresh connect() attempt, so react to them too, not just
  // connect() rejections.
  client.on("close", invalidate);
  client.on("error", invalidate);
  client.on("topologyClosed", invalidate);

  const promise = client.connect();
  // A frozen serverless instance can thaw minutes later and reject this with
  // no awaiter yet attached; without this it crashes the whole process.
  promise.catch(() => {});
  return promise;
}

function isMongoSelectionError(error) {
  const name = error?.name ?? "";
  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoTimeoutError"
  );
}

export async function getCollection(name) {
  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    if (!globalThis._fartGirlMongoPromise) {
      globalThis._fartGirlMongoPromise = connectClient();
    }

    try {
      const client = await globalThis._fartGirlMongoPromise;
      return client.db(process.env.MONGODB_DB || "fartgirl").collection(name);
    } catch (error) {
      lastError = error;
      // Drop the failed connection so the retry (or next call) reconnects
      // instead of reusing a permanently rejected promise.
      invalidate();

      if (!isMongoSelectionError(error) || attempt >= RETRY_ATTEMPTS) {
        throw error;
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError ?? new Error("Mongo connection unavailable");
}