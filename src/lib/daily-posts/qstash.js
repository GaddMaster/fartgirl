import { Client, Receiver } from "@upstash/qstash";

// Same QStash account and verification approach as ufocoin (src/lib/ufo-story/auth.js).
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

export function getPublicBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "https://www.fartgirlsolana.com").replace(/\/+$/, "");
}

export function getQStashClient() {
  if (!process.env.QSTASH_TOKEN) {
    throw new Error("Missing QSTASH_TOKEN");
  }

  return new Client({
    token: process.env.QSTASH_TOKEN,
    baseUrl: process.env.QSTASH_URL || undefined,
  });
}

// QStash signs the published URL; Vercel's request.url can differ (www vs apex, internal host).
async function verifyQStashSignature(signature, body, requestUrl) {
  const { pathname, search } = new URL(requestUrl);
  const attempts = [
    { signature, body },
    { signature, body, url: `${getPublicBaseUrl()}${pathname}${search}` },
    { signature, body, url: requestUrl },
  ];

  for (const options of attempts) {
    try {
      await receiver.verify(options);
      return true;
    } catch {
      // try the next URL form
    }
  }
  return false;
}

export async function verifyDailyPostRequest(request) {
  const signature = request.headers.get("upstash-signature");
  const authorization = request.headers.get("authorization");
  let bodyText = "";

  if (signature) {
    bodyText = await request.text();
    if (await verifyQStashSignature(signature, bodyText, request.url)) {
      return { authorized: true, via: "qstash", bodyText };
    }
  }

  const validCron = process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`;
  const validSecret = process.env.SECRET && authorization === `Bearer ${process.env.SECRET}`;
  if (validCron || validSecret) {
    if (!signature && request.method === "POST") bodyText = await request.text().catch(() => "");
    return { authorized: true, via: "bearer", bodyText };
  }

  return { authorized: false, via: null, bodyText };
}
