import { list } from "@vercel/blob";

import { getCollection } from "@/lib/mongo";
import { getXAccountStatus } from "@/lib/comic/twitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request) {
  const authorization = request.headers.get("authorization");
  const validCron = process.env.CRON_SECRET
    && authorization === `Bearer ${process.env.CRON_SECRET}`;
  const validSecret = process.env.SECRET
    && authorization === `Bearer ${process.env.SECRET}`;

  return Boolean(validCron || validSecret);
}

function configured(names) {
  const missing = names.filter((name) => !process.env[name]);
  return {
    configured: missing.length === 0,
    missing,
  };
}

async function testXai() {
  const config = configured(["XAI_API_KEY"]);
  if (!config.configured) return { ok: false, ...config };

  const headers = { Authorization: `Bearer ${process.env.XAI_API_KEY}` };
  const [modelsResponse, identityResponse, keyResponse] = await Promise.all([
    fetch("https://api.x.ai/v1/image-generation-models", { headers }),
    fetch("https://api.x.ai/v1/me", { headers }),
    fetch("https://api.x.ai/v1/api-key", { headers }),
  ]);
  if (!modelsResponse.ok) {
    return {
      ok: false,
      status: modelsResponse.status,
      error: (await modelsResponse.text()).slice(0, 300),
    };
  }

  const payload = await modelsResponse.json();
  const models = Array.isArray(payload?.models) ? payload.models : [];
  const model = process.env.COMIC_IMAGE_MODEL || "grok-imagine-image-2.0";
  const identity = identityResponse.ok ? await identityResponse.json() : null;
  const apiKey = keyResponse.ok ? await keyResponse.json() : null;

  return {
    ok: true,
    configured: true,
    account: {
      userId: identity?.user_id || null,
      teamId: identity?.team_id || null,
      zeroDataRetention: identity?.zdr_status || null,
      teamBlocked: Boolean(identity?.team_blocked),
      apiKeyName: apiKey?.name || null,
      apiKeyId: apiKey?.api_key_id || identity?.api_key?.api_key_id || null,
      apiKeyBlocked: Boolean(apiKey?.api_key_blocked ?? identity?.api_key?.blocked),
      apiKeyDisabled: Boolean(apiKey?.api_key_disabled ?? identity?.api_key?.disabled),
    },
    requestedModel: model,
    requestedModelAvailable: models.some((entry) => entry?.id === model),
    availableImageModels: models.map((entry) => entry?.id).filter(Boolean),
  };
}

async function testX() {
  const config = configured([
    "X_API_KEY",
    "X_API_KEY_SECRET",
    "X_ACCESS_TOKEN",
    "X_ACCESS_TOKEN_SECRET",
    "X_EXPECTED_USERNAME",
  ]);
  if (!config.configured) return { ok: false, ...config };

  const account = await getXAccountStatus();
  return {
    ok: account.expectedAccountMatches,
    configured: true,
    ...account,
    note: "OAuth identity is verified. Write permission is not tested because this endpoint never uploads media or creates a post.",
  };
}

async function testMongo() {
  const config = configured(["MONGODB_URI"]);
  if (!config.configured) return { ok: false, ...config };

  const pages = await getCollection("pages");
  await pages.findOne({}, { projection: { _id: 1 } });
  return { ok: true, configured: true };
}

async function testBlob() {
  const config = configured(["BLOB_READ_WRITE_TOKEN"]);
  if (!config.configured) return { ok: false, ...config };

  await list({ limit: 1 });
  return { ok: true, configured: true };
}

async function runTest(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = await Promise.allSettled([
    testMongo(),
    testBlob(),
    testXai(),
    testX(),
  ]);
  const keys = ["mongo", "blob", "xai", "x"];
  const results = Object.fromEntries(checks.map((result, index) => {
    if (result.status === "fulfilled") return [keys[index], result.value];
    return [keys[index], { ok: false, error: result.reason?.message || String(result.reason) }];
  }));
  const ok = Object.values(results).every((result) => result.ok);

  return Response.json({
    ok,
    checks: results,
    publishingEnabled: process.env.COMIC_PUBLISH_ENABLED === "1",
    note: "This endpoint performs only read-only checks. It does not generate an image, upload media, or publish to X.",
  }, { status: ok ? 200 : 503 });
}

export async function GET(request) {
  return runTest(request);
}

export async function POST(request) {
  return runTest(request);
}