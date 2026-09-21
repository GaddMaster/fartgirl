import { TwitterApi } from "twitter-api-v2";

const REQUIRED_ENV = [
  "X_API_KEY",
  "X_API_KEY_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
];

function getClient() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing X credentials: ${missing.join(", ")}`);
  }

  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });
}

function normalizeUsername(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

export async function assertExpectedXAccount() {
  const expectedUsername = normalizeUsername(process.env.X_EXPECTED_USERNAME);
  if (!expectedUsername) {
    throw new Error("Missing X_EXPECTED_USERNAME; refusing to publish without an account guard");
  }

  const client = getClient();
  const account = await client.v2.me();
  const actualUsername = normalizeUsername(account?.data?.username);

  if (actualUsername !== expectedUsername) {
    throw new Error(
      `X account mismatch: expected @${expectedUsername}, authenticated as @${actualUsername || "unknown"}`,
    );
  }

  return account.data;
}

export async function getXAccountStatus() {
  const expectedUsername = normalizeUsername(process.env.X_EXPECTED_USERNAME);
  const client = getClient();
  const account = await client.v2.me();
  const actualUsername = normalizeUsername(account?.data?.username);

  return {
    id: account?.data?.id || null,
    username: actualUsername || null,
    name: account?.data?.name || null,
    expectedUsername: expectedUsername || null,
    expectedAccountMatches: Boolean(expectedUsername && actualUsername === expectedUsername),
  };
}

export async function postComicToX(text, imageBuffer, contentType) {
  const client = getClient();
  const mediaId = await client.v1.uploadMedia(imageBuffer, {
    mimeType: contentType,
    target: "tweet",
  });

  return client.v2.tweet({
    text,
    media: { media_ids: [mediaId] },
  });
}