import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

const options = {
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 20_000,
};

function connectClient() {
  const promise = new MongoClient(uri, options).connect();
  // A frozen serverless instance can thaw minutes later and reject this with
  // no awaiter yet attached; without this it crashes the whole process.
  promise.catch(() => {});
  return promise;
}

export async function getCollection(name) {
  if (!globalThis._fartGirlMongoPromise) {
    globalThis._fartGirlMongoPromise = connectClient();
  }

  let client;
  try {
    client = await globalThis._fartGirlMongoPromise;
  } catch (error) {
    // Drop the failed connection so the next call reconnects instead of
    // reusing a permanently rejected promise for the life of the instance.
    globalThis._fartGirlMongoPromise = null;
    throw error;
  }

  return client.db(process.env.MONGODB_DB || "fartgirl").collection(name);
}