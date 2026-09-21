import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

const options = {};
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!globalThis._fartGirlMongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalThis._fartGirlMongoClientPromise = client.connect();
  }
  clientPromise = globalThis._fartGirlMongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getCollection(name) {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "fartgirl").collection(name);
}